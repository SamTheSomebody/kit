import { describe, expect, it } from "vitest";

import { hintParts } from "../menu.ts";

describe("hintParts", () => {
	it("draws a key list as keys", () => {
		expect(hintParts(["⌘", "W"])).toEqual({ keys: ["⌘", "W"] });
	});

	it("reads a string of kbd runs as keys, entities decoded", () => {
		expect(hintParts("<kbd>⌘</kbd> <kbd>&lt;</kbd>")).toEqual({ keys: ["⌘", "<"] });
	});

	it("shows any other string as text, markup and all", () => {
		expect(hintParts("div.panel hero.png")).toEqual({ text: "div.panel hero.png" });
		const hostile = '<kbd>⌘</kbd><img src=x onerror="alert(1)">';
		expect(hintParts(hostile)).toEqual({ text: hostile });
	});
});
