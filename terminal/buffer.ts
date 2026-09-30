/**
 * Reading logical lines out of the emulator's buffer.
 *
 * A terminal buffer is rows, not lines: one printed line that outran the
 * width is several rows, each flagged `isWrapped` after the first. Link
 * detection has to see the line the way the process wrote it, or a path that
 * happens to straddle the right edge stops being clickable exactly when the
 * pane is narrow — which is when it is a split, which is when it is most
 * likely to be narrow.
 *
 * Structurally typed against xterm's buffer rather than importing it, so the
 * rule is testable with plain objects.
 */

export type BufferRow = {
	isWrapped: boolean;
	translateToString(trimRight?: boolean): string;
};

export type LogicalLine = {
	/** Index of the row the line starts on. */
	firstRow: number;
	text: string;
};

/**
 * The whole logical line `row` belongs to, plus where it starts.
 *
 * Every row but the last is read UN-trimmed, so it is exactly one screen
 * width and a string offset maps back to a cell by dividing by the width.
 * Trimming one would slide every match on the rows after it left by however
 * many spaces it ate.
 */
export const logicalLineAt = (rowAt: (index: number) => BufferRow | undefined, row: number): LogicalLine => {
	let firstRow = row;
	while (firstRow > 0 && rowAt(firstRow)?.isWrapped === true) {
		firstRow -= 1;
	}
	let lastRow = row;
	while (rowAt(lastRow + 1)?.isWrapped === true) {
		lastRow += 1;
	}
	let text = "";
	for (let index = firstRow; index <= lastRow; index += 1) {
		text += rowAt(index)?.translateToString(index === lastRow) ?? "";
	}
	return { firstRow, text };
};
