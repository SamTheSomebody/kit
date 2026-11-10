import { describe, expect, it } from "vitest";

import { fuzzyScore, pickerRows, RECENT_LIMIT, slotAccepts, withRecent, type ObjectItem } from "../objectField.ts";

const events: ObjectItem[] = [
	{ id: "freeSpinTriggerCount", label: "freeSpinTriggerCount", folder: "Free spins" },
	{ id: "freeSpinEnd", folder: "Free spins" },
	{ id: "winTally", note: "game", folder: "Wins" },
	{ id: "spinStart" },
];

const ids = (rows: { id: string }[]): string[] => rows.map((row) => row.id);

describe("fuzzyScore", () => {
	it("matches every character in order, anywhere", () => {
		expect(fuzzyScore("freeSpinCounter", "fsc")).toBeDefined();
		expect(fuzzyScore("freeSpinCounter", "csf")).toBeUndefined();
	});

	it("ranks a substring above a scattered match", () => {
		expect(fuzzyScore("spinEnd", "spin") ?? 0).toBeGreaterThan(fuzzyScore("sPayIN", "spin") ?? 0);
	});

	it("ranks word starts above letters inside words", () => {
		expect(fuzzyScore("freeSpinEnd", "fse") ?? 0).toBeGreaterThan(fuzzyScore("fusee", "fse") ?? 0);
	});

	it("is case-insensitive and ignores spaces in the query", () => {
		expect(fuzzyScore("freeSpinEnd", "SPIN end")).toBeDefined();
	});
});

describe("pickerRows", () => {
	const options = { recents: [], allowEmpty: false, emptyLabel: "(none)" };

	it("lists everything by folder while nothing is typed", () => {
		const rows = pickerRows(events, "", options);
		expect(ids(rows)).toEqual(["spinStart", "freeSpinTriggerCount", "freeSpinEnd", "winTally"]);
		expect(rows.map((row) => row.group)).toEqual([undefined, "Free spins", "Free spins", "Wins"]);
	});

	it("puts the empty choice and the recent picks first", () => {
		const rows = pickerRows(events, "", { ...options, allowEmpty: true, recents: ["winTally", "gone"] });
		expect(ids(rows).slice(0, 2)).toEqual(["", "winTally"]);
		expect(rows[1]?.group).toBe("Recent");
	});

	it("lists only matches, best first, once typed", () => {
		expect(ids(pickerRows(events, "end", options))).toEqual(["freeSpinEnd"]);
		expect(ids(pickerRows(events, "spin", options))[0]).toBe("spinStart");
	});

	it("drops the empty choice and the folders once typed", () => {
		const rows = pickerRows(events, "tally", { ...options, allowEmpty: true });
		expect(rows).toEqual([{ id: "winTally", label: "winTally", note: "game", group: undefined }]);
	});
});

describe("withRecent", () => {
	it("moves a pick to the front once, and keeps a few", () => {
		expect(withRecent(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
		const many = Array.from({ length: RECENT_LIMIT * 3 }, (_, index) => `k${index}`);
		expect(withRecent(many, "new")).toHaveLength(RECENT_LIMIT * 2);
	});

	it("doesn't remember the empty choice", () => {
		expect(withRecent(["a"], "")).toEqual(["a"]);
	});
});

describe("slotAccepts", () => {
	it("takes a carry of its kind that it lists", () => {
		expect(slotAccepts(["event"], events, { kind: "event", id: "spinStart", label: "spinStart" })).toBe(true);
	});

	it("refuses another kind, or an id it doesn't list", () => {
		expect(slotAccepts(["event"], events, { kind: "node", id: "spinStart", label: "spinStart" })).toBe(false);
		expect(slotAccepts(["event"], events, { kind: "event", id: "nope", label: "nope" })).toBe(false);
	});

	it("takes any of several kinds", () => {
		expect(slotAccepts(["mount", "node"], events, { kind: "node", id: "winTally", label: "winTally" })).toBe(true);
	});
});
