import { describe, expect, it } from "vitest";

import { logicalLineAt, type BufferRow } from "../buffer.ts";

/** Rows as a terminal holds them: `wrapped` marks a continuation, and an
 *  un-trimmed read is padded out to the screen width. */
const screen = (width: number, rows: { text: string; wrapped?: boolean }[]) => {
	const buffer: BufferRow[] = rows.map((row) => ({
		isWrapped: row.wrapped === true,
		translateToString: (trimRight?: boolean) =>
			trimRight === true ? row.text.replace(/\s+$/, "") : row.text.padEnd(width, " "),
	}));
	return (index: number): BufferRow | undefined => buffer[index];
};

describe("logicalLineAt", () => {
	it("returns a single row as itself", () => {
		const rowAt = screen(10, [{ text: "one" }, { text: "two" }]);
		expect(logicalLineAt(rowAt, 1)).toEqual({ firstRow: 1, text: "two" });
	});

	it("joins a wrapped line from any row of it", () => {
		const rowAt = screen(8, [
			{ text: "unrelated" },
			{ text: "tools/lo" },
			{ text: "bby/vite", wrapped: true },
			{ text: ".config.ts:12", wrapped: true },
			{ text: "after" },
		]);
		const expected = { firstRow: 1, text: "tools/lobby/vite.config.ts:12" };
		expect(logicalLineAt(rowAt, 1)).toEqual(expected);
		expect(logicalLineAt(rowAt, 2)).toEqual(expected);
		expect(logicalLineAt(rowAt, 3)).toEqual(expected);
	});

	it("keeps every row but the last at full width, so offsets stay true", () => {
		const rowAt = screen(8, [{ text: "ab" }, { text: "cd", wrapped: true }]);
		expect(logicalLineAt(rowAt, 0).text).toBe("ab      cd");
	});

	it("stops at the top of the buffer", () => {
		const rowAt = screen(4, [
			{ text: "abcd", wrapped: true },
			{ text: "ef", wrapped: true },
		]);
		expect(logicalLineAt(rowAt, 1)).toEqual({ firstRow: 0, text: "abcdef" });
	});
});
