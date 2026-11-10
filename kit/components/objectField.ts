/* The object field's rules: what the picker lists, in which order, and what
 * a slot takes. DOM-free, so `objectField.test.ts` holds them.
 *
 * A slot holds one item of a domain (an event, a motion, a node) by id. It
 * replaces a native select over the whole domain, which at 70+ entries was
 * a scroll hunt with no search. Unity's object field is the model: a pill
 * showing what's held, a drop target for a dragged row, and a picker with
 * search for the rest.
 */

import type { Carried } from "./carry";

/** One thing a slot can hold. */
export type ObjectItem = {
	readonly id: string;
	/** What the pill and the picker read; the id when absent. */
	readonly label?: string;
	/** Muted text after the label: a summary, a type. */
	readonly note?: string;
	/** The picker's group for it while nothing is typed. */
	readonly folder?: string;
};

/** A picker row: an item, or `""` for the empty choice. */
export type PickerRow = {
	readonly id: string;
	readonly label: string;
	readonly note: string | undefined;
	/** The group heading it sits under; undefined for none. */
	readonly group: string | undefined;
};

export const itemLabel = (item: ObjectItem): string => item.label ?? item.id;

const isWordStart = (text: string, at: number): boolean => {
	if (at === 0) return true;
	const before = text[at - 1] ?? "";
	const here = text[at] ?? "";
	/* after a separator, or a capital after a lower-case letter (camelCase) */
	return !/[a-z0-9]/i.test(before) || (/[A-Z]/.test(here) && /[a-z0-9]/.test(before));
};

/**
 * How well `text` matches `query`, or undefined when it doesn't: every query character in order,
 * anywhere (`fsc` finds `freeSpinCounter`). Contiguous runs and word starts score higher, and a
 * plain substring beats any scattered match.
 */
export const fuzzyScore = (text: string, query: string): number | undefined => {
	const needle = query.trim().toLowerCase();
	if (needle === "") return 0;
	const lower = text.toLowerCase();
	const substring = lower.indexOf(needle);
	if (substring >= 0) {
		return 1000 + (isWordStart(text, substring) ? 100 : 0) - substring - (text.length - needle.length) / 100;
	}
	let score = 0;
	let from = 0;
	let previous = -2;
	for (const char of needle) {
		if (char === " ") continue;
		const at = lower.indexOf(char, from);
		if (at < 0) return undefined;
		score += at === previous + 1 ? 5 : isWordStart(text, at) ? 8 : 1;
		previous = at;
		from = at + 1;
	}
	return score - text.length / 100;
};

/** How many recent picks the picker shows above the rest. */
export const RECENT_LIMIT = 5;

/**
 * The picker's rows. Nothing typed: the empty choice (when `allowEmpty`), the recent picks, then
 * every item under its folder. Typed: the matches alone, best first, on the label or the id.
 */
export const pickerRows = (
	items: readonly ObjectItem[],
	query: string,
	options: { readonly recents: readonly string[]; readonly allowEmpty: boolean; readonly emptyLabel: string },
): PickerRow[] => {
	const row = (item: ObjectItem, group: string | undefined): PickerRow => ({
		id: item.id,
		label: itemLabel(item),
		note: item.note,
		group,
	});
	if (query.trim() !== "") {
		return items
			.map((item) => {
				const label = fuzzyScore(itemLabel(item), query);
				const id = fuzzyScore(item.id, query);
				const score = Math.max(label ?? -Infinity, id ?? -Infinity);
				return { item, score };
			})
			.filter(({ score }) => score > -Infinity)
			.sort((a, b) => b.score - a.score || itemLabel(a.item).localeCompare(itemLabel(b.item)))
			.map(({ item }) => row(item, undefined));
	}
	const byId = new Map(items.map((item) => [item.id, item]));
	const recent = options.recents.flatMap((id) => {
		const item = byId.get(id);
		return item ? [row(item, "Recent")] : [];
	});
	const foldered = [...items]
		.sort((a, b) => (a.folder ?? "").localeCompare(b.folder ?? ""))
		.map((item) => row(item, item.folder));
	return [
		...(options.allowEmpty ? [{ id: "", label: options.emptyLabel, note: undefined, group: undefined }] : []),
		...recent.slice(0, RECENT_LIMIT),
		...foldered,
	];
};

/** `recents` with `id` first, once, kept to a few more than the picker shows. */
export const withRecent = (recents: readonly string[], id: string): string[] =>
	id === "" ? [...recents] : [id, ...recents.filter((other) => other !== id)].slice(0, RECENT_LIMIT * 2);

/** Whether a slot over `items` takes `carried`: its kind must be one of `kinds` and its id one the slot lists. */
export const slotAccepts = (kinds: readonly string[], items: readonly ObjectItem[], carried: Carried): boolean =>
	kinds.includes(carried.kind) && items.some((item) => item.id === carried.id);
