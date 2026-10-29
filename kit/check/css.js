/* A CSS scanner small enough to read in one sitting: selectors and
   declarations with their offsets, and which `kit-allow` comments cover
   them. It does not parse CSS; it tracks braces, strings and comments,
   which is all the rules need. */

const ALLOW = /^\s*kit-allow\s+([a-z-]+)\s*(?::\s*(.*?))?\s*$/s;

/**
 * @typedef {{ rule: string, reason: string, start: number }} Allow
 * @typedef {{ text: string, start: number, allows: Set<string> }} Selector
 * @typedef {{ property: string, value: string, start: number, allows: Set<string> }} Declaration
 * @typedef {{ selectors: Selector[], declarations: Declaration[], allowComments: Allow[] }} Scan
 */

/**
 * Reads a `kit-allow <rule>: <reason>` comment body, or undefined for any other comment.
 * @param {string} body
 * @param {number} start
 * @returns {Allow | undefined}
 */
export const parseAllow = (body, start) => {
	const match = ALLOW.exec(body);
	return match ? { rule: match[1] ?? "", reason: match[2] ?? "", start } : undefined;
};

/**
 * Scans `css`, reporting offsets relative to `base` (where the CSS starts in its file).
 *
 * A `kit-allow` comment covers the next selector or declaration. Over a selector it covers the
 * whole block, and trailing a declaration on the same line it covers that declaration.
 * @param {string} css
 * @param {number} base
 * @returns {Scan}
 */
export const scanCss = (css, base = 0) => {
	/** @type {Selector[]} */
	const selectors = [];
	/** @type {Declaration[]} */
	const declarations = [];
	/** @type {Allow[]} */
	const allowComments = [];
	/** @type {Set<string>[]} */
	const blocks = [new Set()];
	/** @type {Set<string>} */
	let pending = new Set();
	let buffer = "";
	let bufferStart = -1;
	/** @type {Declaration | undefined} */
	let last;
	let lastEnd = -1;

	const covered = () => new Set([...(blocks.at(-1) ?? []), ...pending]);
	const statement = () => {
		const text = buffer.trim();
		const at = bufferStart + (buffer.length - buffer.trimStart().length);
		buffer = "";
		bufferStart = -1;
		return { text, at };
	};

	for (let index = 0; index < css.length; index++) {
		const char = css.charAt(index);
		if (css.startsWith("/*", index)) {
			const end = css.indexOf("*/", index + 2);
			const close = end === -1 ? css.length : end + 2;
			const allow = parseAllow(css.slice(index + 2, close - 2), base + index);
			if (allow) {
				allowComments.push(allow);
				const trailing = last !== undefined && !css.slice(lastEnd, index).includes("\n");
				if (trailing && last) last.allows.add(allow.rule);
				else pending.add(allow.rule);
			}
			index = close - 1;
			continue;
		}
		if (char === '"' || char === "'") {
			const end = css.indexOf(char, index + 1);
			const close = end === -1 ? css.length - 1 : end;
			if (bufferStart === -1) bufferStart = index;
			buffer += css.slice(index, close + 1);
			index = close;
			continue;
		}
		if (char === "{") {
			const { text, at } = statement();
			const allows = covered();
			pending = new Set();
			if (text !== "" && !text.startsWith("@")) {
				selectors.push({ text, start: base + at, allows });
			}
			blocks.push(allows);
			last = undefined;
			continue;
		}
		if (char === ";" || char === "}") {
			const { text, at } = statement();
			const colon = text.indexOf(":");
			if (colon > 0 && !text.startsWith("@")) {
				last = {
					property: text.slice(0, colon).trim().toLowerCase(),
					value: text
						.slice(colon + 1)
						.trim()
						.replace(/\s+/g, " "),
					start: base + at,
					allows: covered(),
				};
				declarations.push(last);
				lastEnd = index + 1;
				pending = new Set();
			}
			if (char === "}") {
				if (blocks.length > 1) blocks.pop();
				last = undefined;
			}
			continue;
		}
		if (bufferStart === -1 && char.trim() !== "") bufferStart = index;
		if (bufferStart !== -1) buffer += char;
	}
	return { selectors, declarations, allowComments };
};

/**
 * Declarations in an inline `style="…"` value, all starting at the attribute.
 * @param {string} text
 * @param {number} start
 * @param {Set<string>} allows
 * @returns {Declaration[]}
 */
export const inlineDeclarations = (text, start, allows) =>
	text
		.split(";")
		.map((part) => part.trim())
		.filter((part) => part.includes(":"))
		.map((part) => {
			const colon = part.indexOf(":");
			return {
				property: part.slice(0, colon).trim().toLowerCase(),
				value: part.slice(colon + 1).trim(),
				start,
				allows,
			};
		});
