/* One sorted column per table, and clicking the sorted one turns it around.
   The rows themselves are the consumer's data — `sortRows` is offered for
   the common case and nothing forces its use. */

export type SortDirection = "ascending" | "descending";
export type SortState = { column: string; direction: SortDirection } | undefined;

/* A fresh column starts descending: a table is nearly always sorted to put
   the interesting end first, and for a number that is the large one. */
export const nextSort = (current: SortState, column: string): SortState =>
	current && current.column === column && current.direction === "descending"
		? { column, direction: "ascending" }
		: { column, direction: "descending" };

export const sortRows = <Row>(rows: Row[], read: (row: Row) => string | number, direction: SortDirection): Row[] => {
	const sign = direction === "ascending" ? 1 : -1;
	return [...rows].sort((a, b) => {
		const left = read(a);
		const right = read(b);
		if (typeof left === "number" && typeof right === "number") {
			return (left - right) * sign;
		}
		return String(left).localeCompare(String(right)) * sign;
	});
};
