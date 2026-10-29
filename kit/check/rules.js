/* The six rules. Each one names the kit thing to reach for instead, so a
   finding says what to do and not only what is wrong. They hold in the
   consumer's tool chrome only: the kit owns its own CSS, and a game is not
   tool chrome. */

/** @typedef {import('./css.js').Declaration} Declaration */
/** @typedef {import('./css.js').Selector} Selector */
/** @typedef {{ rule: string, start: number, message: string }} Finding */

export const RULES = /** @type {const} */ ({
	color: "A colour literal. Use a --tool-* token.",
	structure: "Structural CSS. Use Container, Columns, Column, Row or Slot (and their recipes).",
	"kit-override": "Restyles a kit or dock class. Use a prop, or promote the need into the kit.",
	type: "Type off the scale. Use --tool-font, --tool-font-size-body or --tool-font-size-title, sentence case.",
	radius: "A rounded corner. Tool chrome is square.",
	"native-control": "A native control. Use the kit control.",
});

/** @typedef {keyof typeof RULES} Rule */

const COLOR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|color-mix)\(/i;
const STRUCTURE_PREFIXES = ["margin", "padding", "flex", "grid", "place-", "justify-"];
const STRUCTURE_PROPERTIES = new Set([
	"gap",
	"row-gap",
	"column-gap",
	"align-items",
	"align-content",
	"align-self",
	"order",
]);
const FLOW_DISPLAY = /^(?:inline-)?(?:flex|grid)$/;
const KIT_CLASS = /\.(?:kit-[\w-]+|btn(?![\w-])|dock-[\w-]+)/;

/**
 * The control to use instead of a native element.
 * @type {Record<string, string>}
 */
export const NATIVE_CONTROLS = {
	button: "Button or IconButton",
	select: "Select",
	input: "Field",
	textarea: "Multiline",
	table: "Table",
};

/** Kit controls for `input` types other than text ones; a type in neither has no kit control yet. */
const INPUT_CONTROLS = /** @type {Record<string, string>} */ ({
	checkbox: "Checkbox",
	radio: "Segment",
	range: "Slider",
});
const TEXT_INPUTS = new Set(["", "text", "number", "search", "email", "url", "tel", "password"]);

/** `input` types with no kit control to point at: hidden data and the OS file picker. */
export const NATIVE_INPUT_EXEMPT = new Set(["hidden", "file"]);

/**
 * @param {Rule} rule
 * @param {{ start: number, allows: Set<string> }} at
 * @param {string} detail
 * @returns {Finding[]}
 */
const finding = (rule, at, detail) =>
	at.allows.has(rule) ? [] : [{ rule, start: at.start, message: `${detail}. ${RULES[rule]}` }];

/**
 * @param {Declaration} declaration
 * @returns {Finding[]}
 */
export const checkDeclaration = (declaration) => {
	const { property, value } = declaration;
	/** @type {Finding[]} */
	const findings = [];
	if (property.startsWith("--")) return findings;
	if (COLOR.test(value)) findings.push(...finding("color", declaration, `${property}: ${value}`));
	const structural =
		STRUCTURE_PROPERTIES.has(property) ||
		STRUCTURE_PREFIXES.some((prefix) => property.startsWith(prefix)) ||
		(property === "display" && FLOW_DISPLAY.test(value));
	if (structural) findings.push(...finding("structure", declaration, `${property}: ${value}`));
	const offScale =
		(property === "font-size" && !value.startsWith("var(--tool-font-size-") && value !== "inherit") ||
		(property === "font-family" && value !== "var(--tool-font)" && value !== "inherit") ||
		(property === "text-transform" && value === "uppercase");
	if (offScale) findings.push(...finding("type", declaration, `${property}: ${value}`));
	if (property.endsWith("radius") && !/^0(?:px)?$/.test(value)) {
		findings.push(...finding("radius", declaration, `${property}: ${value}`));
	}
	return findings;
};

/**
 * @param {Selector} selector
 * @returns {Finding[]}
 */
export const checkSelector = (selector) => {
	const match = KIT_CLASS.exec(selector.text);
	return match ? finding("kit-override", selector, `${match[0]} in \`${selector.text}\``) : [];
};

/**
 * @param {string} name
 * @param {string | undefined} type The static `type` of an `input`.
 * @param {{ start: number, allows: Set<string> }} at
 * @returns {Finding[]}
 */
export const checkElement = (name, type, at) => {
	const instead = NATIVE_CONTROLS[name];
	if (instead === undefined) return [];
	if (name === "input" && type !== undefined && NATIVE_INPUT_EXEMPT.has(type)) return [];
	const tag = `<${name}${type ? ` type="${type}"` : ""}>`;
	if (name === "input" && type !== undefined && !TEXT_INPUTS.has(type)) {
		const control = INPUT_CONTROLS[type];
		return control
			? finding("native-control", at, `${tag} (use ${control})`)
			: finding(
					"native-control",
					at,
					`${tag} has no kit control yet; kit-allow it with a reason so it can be promoted`,
				);
	}
	return finding("native-control", at, `${tag} (use ${instead})`);
};
