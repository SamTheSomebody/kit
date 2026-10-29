import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { scanCss } from "../css.js";

/* layout.css is frozen to cssAllow.json: every property it uses is listed
   there with the values it may take, and the list holds nothing unused.
   Moved here from game-mono's checkLayoutCss so the kit holds its own line. */

const kit = join(import.meta.dirname, "..", "..");
const css = readFileSync(join(kit, "layout.css"), "utf8");
const allow = JSON.parse(readFileSync(join(kit, "cssAllow.json"), "utf8")) as {
	properties: string[];
	valuePatterns: Record<string, string>;
	banned: string[];
};
const { declarations } = scanCss(css);

describe("layout.css against cssAllow.json", () => {
	it("bans at-rules and colour literals", () => {
		expect(css).not.toMatch(/@(media|supports|import)\b/);
		expect(declarations.filter(({ value }) => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|color-mix\(/i.test(value))).toEqual([]);
	});

	it("uses only allowed properties with allowed values", () => {
		const problems = declarations.flatMap(({ property, value }) => {
			if (allow.banned.some((banned) => property === banned || property.startsWith(`${banned}-`))) {
				return [`banned ${property}`];
			}
			if (!allow.properties.includes(property)) return [`undeclared ${property}`];
			const pattern = allow.valuePatterns[property];
			return pattern !== undefined && !new RegExp(pattern).test(value) ? [`${property}: ${value}`] : [];
		});
		expect(problems).toEqual([]);
	});

	it("lists no property layout.css does not use", () => {
		const used = new Set(declarations.map(({ property }) => property));
		expect(allow.properties.filter((property) => !used.has(property))).toEqual([]);
	});
});
