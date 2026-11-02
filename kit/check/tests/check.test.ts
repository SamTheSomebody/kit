import { describe, expect, it } from "vitest";

import { checkCss, checkSvelte } from "../check.js";

const rules = (findings: { rule: string }[]): string[] => findings.map((finding) => finding.rule);

describe("checkCss", () => {
	it("flags each rule once", () => {
		const css = `.a { color: #fff; gap: 4px; display: flex; font-size: 11px; border-radius: 3px; }
:global(.kit-section-title) { color: var(--tool-muted); }`;
		expect(rules(checkCss(css)).sort()).toEqual(["color", "kit-override", "radius", "structure", "structure", "type"]);
	});

	it("passes tokens and non-structural display", () => {
		expect(
			checkCss(`.a { color: var(--tool-text); display: none; font-size: var(--tool-font-size-body); --x: #fff; }`),
		).toEqual([]);
	});

	it("finds named colours where a colour goes, and nowhere else", () => {
		expect(rules(checkCss(`.a { color: white; border: 1px solid Red; box-shadow: 0 0 2px black; }`))).toEqual([
			"color",
			"color",
			"color",
		]);
		expect(checkCss(`.a { color: currentColor; background: transparent; animation-name: tomato; }`)).toEqual([]);
	});

	it("holds the font shorthand and uppercase in any case to the type scale", () => {
		expect(rules(checkCss(`.a { font: 12px/1 sans-serif; text-transform: UPPERCASE; }`))).toEqual(["type", "type"]);
		expect(checkCss(`.a { font: inherit; }`)).toEqual([]);
	});

	it("lets a kit-allow cover the next declaration, a trailing one, or a whole block", () => {
		const css = `.a {
	/* kit-allow structure: canvas host */
	display: flex;
	gap: 4px; /* kit-allow structure: canvas host */
	padding: 2px;
}
/* kit-allow structure: stage overlay */
.b { margin: 0 auto; flex: 1; }`;
		expect(checkCss(css).map((finding) => finding.message)).toEqual([expect.stringContaining("padding: 2px")]);
	});

	it("rejects a kit-allow without a known rule or a reason", () => {
		expect(rules(checkCss(`/* kit-allow nope: x */ .a {} /* kit-allow color */ .b { color: red; }`))).toEqual([
			"allow",
			"allow",
		]);
	});
});

describe("checkSvelte", () => {
	it("checks the style block, inline styles and native controls", () => {
		const source = `<button style="margin: 4px">a</button>
<input type="file" />
<div style:color="#000"></div>
<style>.x { gap: 1px; }</style>`;
		expect(rules(checkSvelte(source)).sort()).toEqual(["color", "native-control", "structure", "structure"]);
	});

	it("lets a kit-allow comment cover the next element only", () => {
		const source = `<!-- kit-allow native-control: OS colour picker until the kit has a swatch -->
<input type="color" />
<input type="color" />`;
		expect(rules(checkSvelte(source))).toEqual(["native-control"]);
	});

	it("walks into blocks and components", () => {
		const source = `{#if a}{#each b as c}<Thing><select></select></Thing>{/each}{/if}`;
		expect(rules(checkSvelte(source))).toEqual(["native-control"]);
	});
});
