import { describe, expect, it } from "vitest";

import {
	appendEntry,
	countByLevel,
	filterEntries,
	isPinnedToBottom,
	LOG_LEVELS,
	logText,
	matchesFilter,
	SCROLL_PIN_SLACK,
	type LogEntry,
	type LogInput,
} from "../log.ts";

const build = (...inputs: LogInput[]): readonly LogEntry[] => {
	let entries: readonly LogEntry[] = [];
	let sequence = 0;
	for (const input of inputs) {
		sequence += 1;
		entries = appendEntry(entries, { at: "00:00:00", ...input }, 100, sequence);
	}
	return entries;
};

describe("appendEntry", () => {
	it("keeps arrival order — oldest first, newest last", () => {
		const entries = build({ level: "log", text: "one" }, { level: "log", text: "two" });
		expect(entries.map((entry) => entry.text)).toEqual(["one", "two"]);
	});

	it("collapses an immediate repeat into a count instead of a second line", () => {
		const entries = build(
			{ level: "warn", text: "tick" },
			{ level: "warn", text: "tick" },
			{ level: "warn", text: "tick" },
		);
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({ text: "tick", repeats: 3 });
	});

	it("moves the clock to the LATEST occurrence of a repeat", () => {
		let entries = build({ level: "log", text: "tick", at: "00:00:01" });
		entries = appendEntry(entries, { level: "log", text: "tick", at: "00:00:09" }, 100, 2);
		expect(entries[0]).toMatchObject({ at: "00:00:09", repeats: 2 });
	});

	it("does not fold two identical lines with something between them", () => {
		// They are two events in a sequence; folding them would rewrite the
		// order the reader is using to work out what happened.
		const entries = build(
			{ level: "log", text: "spin" },
			{ level: "log", text: "win" },
			{ level: "log", text: "spin" },
		);
		expect(entries.map((entry) => entry.text)).toEqual(["spin", "win", "spin"]);
	});

	it("treats the same text at a different level as a different line", () => {
		const entries = build({ level: "log", text: "gone" }, { level: "error", text: "gone" });
		expect(entries).toHaveLength(2);
	});

	it("drops the OLDEST line at the limit", () => {
		let entries: readonly LogEntry[] = [];
		for (let index = 0; index < 5; index += 1) {
			entries = appendEntry(entries, { level: "log", text: `line ${index}`, at: "00:00:00" }, 3, index);
		}
		expect(entries.map((entry) => entry.text)).toEqual(["line 2", "line 3", "line 4"]);
	});
});

describe("countByLevel", () => {
	it("counts a repeated line once — the badge on the line says how many", () => {
		const entries = build(
			{ level: "error", text: "boom" },
			{ level: "error", text: "boom" },
			{ level: "warn", text: "hm" },
		);
		expect(countByLevel(entries)).toMatchObject({ error: 1, warn: 1, log: 0 });
	});

	it("answers for every level, including the ones with nothing in them", () => {
		expect(Object.keys(countByLevel([])).sort()).toEqual([...LOG_LEVELS].sort());
	});
});

describe("the filter", () => {
	const entries = build(
		{ level: "error", text: "missing atlas symbols.json" },
		{ level: "log", text: "spin started" },
		{ level: "debug", text: "frame 12", source: "reels.ts:40" },
	);

	it("subtracts by level", () => {
		const shown = filterEntries(entries, { levels: new Set(["error"]), text: "" });
		expect(shown.map((entry) => entry.text)).toEqual(["missing atlas symbols.json"]);
	});

	it("shows nothing when every level is off — an empty set is a real answer", () => {
		expect(filterEntries(entries, { levels: new Set(), text: "" })).toEqual([]);
	});

	it("matches the text case-insensitively, and matches the source too", () => {
		const all = new Set(LOG_LEVELS);
		expect(filterEntries(entries, { levels: all, text: "ATLAS" })).toHaveLength(1);
		expect(filterEntries(entries, { levels: all, text: "reels.ts" })).toHaveLength(1);
	});

	it("ignores surrounding whitespace in the needle", () => {
		expect(matchesFilter(entries[1]!, { levels: new Set(LOG_LEVELS), text: "  spin  " })).toBe(true);
	});
});

describe("isPinnedToBottom", () => {
	it("is pinned at the bottom, and within the slack of it", () => {
		expect(isPinnedToBottom({ scrollTop: 900, scrollHeight: 1000, clientHeight: 100 })).toBe(true);
		expect(isPinnedToBottom({ scrollTop: 900 - SCROLL_PIN_SLACK, scrollHeight: 1000, clientHeight: 100 })).toBe(true);
	});

	it("is not pinned once the reader has scrolled away — they are reading", () => {
		expect(isPinnedToBottom({ scrollTop: 0, scrollHeight: 1000, clientHeight: 100 })).toBe(false);
	});

	it("is pinned when there is nothing to scroll", () => {
		expect(isPinnedToBottom({ scrollTop: 0, scrollHeight: 100, clientHeight: 100 })).toBe(true);
	});
});

describe("logText", () => {
	it("renders oldest first with the level, the count and the source", () => {
		const entries = build(
			{ level: "error", text: "boom", at: "01:02:03", source: "a.ts:1" },
			{ level: "error", text: "boom", at: "01:02:04", source: "a.ts:1" },
		);
		expect(logText(entries)).toBe("01:02:04 ERROR boom (×2)  a.ts:1");
	});
});
