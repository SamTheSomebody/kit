/**
 * The console kit's SECOND pane, and its pure half.
 *
 * `createTerminalPane` is a VT: bytes from a process, escape sequences and
 * all, in a fixed cell grid. That is the right object for a `pnpm verify` run
 * and the wrong one for a mirror of another document's `console` — which is
 * what the compare workbench has beside each game, and what a game shell's own
 * log pane wants. Those entries arrive already STRUCTURED (a level, a time, a
 * message, sometimes a source), they wrap rather than truncating at a column,
 * and the reader filters them by level rather than searching them.
 *
 * So the kit grows a log pane rather than the tools each growing their own
 * (`tools/ui/STATUS.md` `## Deferred`: "a console line"). The model is here,
 * pure and tested; `logPane.ts` draws it.
 *
 * ── What "closer to the chrome console" cost ─────────────────────────────
 * Four things, and each of them is a behaviour rather than a colour:
 *
 * 1. **Chronological, newest at the BOTTOM.** compare's own list ran
 *    newest-first, because a dock re-parent resets `scrollTop` to zero and
 *    the interesting end had to be the end that survives. The pane restores
 *    its own scroll on mount instead, so the natural order comes back.
 * 2. **Repeats collapse to a count.** A game that logs per frame buried
 *    everything else within seconds; chrome has shown `×N` for this since
 *    forever and it is the difference between a readable log and a wall.
 * 3. **Level filtering with live counts**, so "did the rebuild throw" is a
 *    glance rather than a scroll.
 * 4. **Text filtering**, not searching. A console filter subtracts lines; a
 *    find walks between them. For a log the first is what you want.
 */

export type LogLevel = "log" | "info" | "warn" | "error" | "debug";

/** Every level, in the order the filter draws them. */
export const LOG_LEVELS: readonly LogLevel[] = ["error", "warn", "info", "log", "debug"];

/** One line as the pane holds it. `seq` is the stable key for a keyed render. */
export type LogEntry = {
	readonly seq: number;
	readonly level: LogLevel;
	readonly text: string;
	/** Wall clock, `HH:MM:SS`. */
	readonly at: string;
	/** Where it came from — chrome's right-hand column. */
	readonly source?: string;
	/**
	 * How many times this line has arrived in a row, counting the first. 1 for
	 * an ordinary line; the pane draws the badge from 2 up.
	 */
	readonly repeats: number;
};

/** What a caller hands in. The pane stamps the sequence and the clock. */
export type LogInput = {
	readonly level: LogLevel;
	readonly text: string;
	readonly source?: string;
	/** Defaults to now. Passed in only so a test can pin it. */
	readonly at?: string;
};

export type LogFilter = {
	/** Levels to show. An empty set shows nothing, which is a real answer. */
	readonly levels: ReadonlySet<LogLevel>;
	/** Case-insensitive substring over the text and the source. */
	readonly text: string;
};

export const clockText = (when: Date): string => when.toTimeString().slice(0, 8);

/**
 * Append, collapsing an immediate repeat into a count.
 *
 * ONLY AN IMMEDIATE REPEAT, which is chrome's rule and the right one: two
 * identical lines with something else between them are two events in a
 * sequence, and folding them would rewrite the order the reader is using to
 * work out what happened. The clock moves to the LATEST occurrence — the
 * useful question about a repeating line is when it last happened.
 *
 * Returns a new array; the tail is what falls off at the limit, because the
 * oldest line is the one you can most afford to lose.
 */
export const appendEntry = (
	entries: readonly LogEntry[],
	input: LogInput,
	limit: number,
	nextSequence: number,
): readonly LogEntry[] => {
	const at = input.at ?? clockText(new Date());
	const last = entries[entries.length - 1];
	if (last && last.level === input.level && last.text === input.text && last.source === input.source) {
		return [...entries.slice(0, -1), { ...last, at, repeats: last.repeats + 1 }];
	}
	const appended = [
		...entries,
		{ seq: nextSequence, level: input.level, text: input.text, source: input.source, at, repeats: 1 },
	];
	return appended.length > limit ? appended.slice(appended.length - limit) : appended;
};

/** How many lines of each level are held. Repeats count once — the badge on
 *  the line says how many, and a count of 400 next to one line is a lie about
 *  how much there is to read. */
export const countByLevel = (entries: readonly LogEntry[]): Record<LogLevel, number> => {
	const counts: Record<LogLevel, number> = { log: 0, info: 0, warn: 0, error: 0, debug: 0 };
	for (const entry of entries) {
		counts[entry.level] += 1;
	}
	return counts;
};

export const matchesFilter = (entry: LogEntry, filter: LogFilter): boolean => {
	if (!filter.levels.has(entry.level)) {
		return false;
	}
	const needle = filter.text.trim().toLowerCase();
	if (needle === "") {
		return true;
	}
	return entry.text.toLowerCase().includes(needle) || (entry.source ?? "").toLowerCase().includes(needle);
};

export const filterEntries = (entries: readonly LogEntry[], filter: LogFilter): readonly LogEntry[] =>
	entries.filter((entry) => matchesFilter(entry, filter));

/**
 * Is the scrollport close enough to the bottom to be following the log?
 *
 * The whole auto-scroll rule turns on this. A reader who has scrolled up is
 * READING, and yanking them back on the next line is the single worst thing a
 * log pane does; a reader at the bottom is watching, and stopping the scroll
 * is just as wrong. The slack absorbs sub-pixel scroll heights and the last
 * line's own leading — an exact comparison reads as "not at the bottom" on a
 * pane that plainly is.
 */
export const SCROLL_PIN_SLACK = 24;

export const isPinnedToBottom = (metrics: { scrollTop: number; scrollHeight: number; clientHeight: number }): boolean =>
	metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight <= SCROLL_PIN_SLACK;

/** The whole log as plain text, oldest first — for copy-all and for tests. */
export const logText = (entries: readonly LogEntry[]): string =>
	entries
		.map(
			(entry) =>
				`${entry.at} ${entry.level.toUpperCase().padEnd(5)} ${entry.text}${entry.repeats > 1 ? ` (×${entry.repeats})` : ""}${entry.source ? `  ${entry.source}` : ""}`,
		)
		.join("\n");
