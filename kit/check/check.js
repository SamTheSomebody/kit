/* Runs the rules over one file: `.css` as a whole, `.svelte` through the
   compiler's own parser (its `<style>`, static `style` attributes and
   `style:` directives, and its elements). */

import { parse } from "svelte/compiler";
import { inlineDeclarations, parseAllow, scanCss } from "./css.js";
import { RULES, checkDeclaration, checkElement, checkSelector } from "./rules.js";

/** @typedef {import('./rules.js').Finding} Finding */
/** @typedef {import('./css.js').Scan} Scan */
/** @typedef {{ type: string, start: number, data?: string, name?: string, attributes?: any[] }} Node */

/**
 * Every `kit-allow` must name a rule and say why: an exception nobody can read is the thing this
 * check exists to stop.
 * @param {import('./css.js').Allow} allow
 * @returns {Finding[]}
 */
const checkAllow = (allow) => {
	if (!(allow.rule in RULES)) {
		return [{ rule: "allow", start: allow.start, message: `kit-allow names no rule "${allow.rule}"` }];
	}
	if (allow.reason.trim() === "") {
		return [{ rule: "allow", start: allow.start, message: `kit-allow ${allow.rule} gives no reason` }];
	}
	return [];
};

/**
 * @param {Scan} scan
 * @returns {Finding[]}
 */
const checkScan = (scan) => [
	...scan.selectors.flatMap(checkSelector),
	...scan.declarations.flatMap(checkDeclaration),
	...scan.allowComments.flatMap(checkAllow),
];

/**
 * The static text of an attribute value, or undefined when any part is an expression.
 * @param {any} value
 * @returns {string | undefined}
 */
const staticText = (value) => {
	if (!Array.isArray(value)) return undefined;
	if (value.some((part) => part.type !== "Text")) return undefined;
	return value.map((part) => part.data).join("");
};

/**
 * Walks a fragment's nodes, giving each element the `kit-allow` comments right before it.
 * @param {any} fragment
 * @param {(node: Node, allows: Set<string>) => void} visit
 * @param {Finding[]} findings
 */
const walk = (fragment, visit, findings) => {
	/** @type {Set<string>} */
	let allows = new Set();
	for (const node of fragment.nodes ?? []) {
		if (node.type === "Text" && node.data.trim() === "") continue;
		if (node.type === "Comment") {
			const allow = parseAllow(node.data, node.start);
			if (allow) {
				findings.push(...checkAllow(allow));
				allows.add(allow.rule);
			}
			continue;
		}
		visit(node, allows);
		allows = new Set();
		for (const value of Object.values(node)) {
			if (value && typeof value === "object" && Array.isArray(value.nodes)) walk(value, visit, findings);
		}
	}
};

/**
 * @param {string} source
 * @returns {Finding[]}
 */
export const checkSvelte = (source) => {
	const ast = parse(source, { modern: true });
	/** @type {Finding[]} */
	const findings = [];
	if (ast.css) findings.push(...checkScan(scanCss(ast.css.content.styles, ast.css.content.start)));
	walk(
		ast.fragment,
		(node, allows) => {
			if (node.type !== "RegularElement" || node.name === undefined) return;
			const attributes = node.attributes ?? [];
			const type = attributes.find((attribute) => attribute.type === "Attribute" && attribute.name === "type");
			findings.push(
				...checkElement(node.name, type ? staticText(type.value) : undefined, { start: node.start, allows }),
			);
			for (const attribute of attributes) {
				const text = staticText(attribute.value);
				if (text === undefined) continue;
				if (attribute.type === "Attribute" && attribute.name === "style") {
					findings.push(...inlineDeclarations(text, attribute.start, allows).flatMap(checkDeclaration));
				}
				if (attribute.type === "StyleDirective") {
					findings.push(...checkDeclaration({ property: attribute.name, value: text, start: attribute.start, allows }));
				}
			}
		},
		findings,
	);
	return findings;
};

/**
 * @param {string} source
 * @returns {Finding[]}
 */
export const checkCss = (source) => checkScan(scanCss(source));

/**
 * The 1-based line of an offset.
 * @param {string} source
 * @param {number} offset
 * @returns {number}
 */
export const lineOf = (source, offset) => source.slice(0, offset).split("\n").length;
