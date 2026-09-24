import { describe, expect, it } from "vitest";

import { insertOffset } from "../view";

describe("insertOffset", () => {
	const tabs = [
		{ offsetLeft: 0, offsetWidth: 40 },
		{ offsetLeft: 40, offsetWidth: 60 },
		{ offsetLeft: 100, offsetWidth: 50 },
	];

	it("sits on the target tab's left edge", () => {
		expect(insertOffset(tabs, 0, 8)).toBe(0);
		expect(insertOffset(tabs, 2, 8)).toBe(100);
	});

	it("sits just past the last tab when the index is past the end", () => {
		expect(insertOffset(tabs, 3, 8)).toBe(150);
	});

	it("uses the fallback when the strip is empty", () => {
		expect(insertOffset([], 0, 8)).toBe(8);
	});
});
