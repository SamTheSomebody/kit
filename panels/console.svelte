<script module lang="ts">
	/* THE CONSOLE'S STATE, apart from its parts. A console is composed —
	   `Console` and whichever of `ConsoleBar`, `ConsoleLines`, `ConsoleInput`
	   and `ConsoleDetail` the tool wants — and the parts meet here, through
	   context. The model is the log pane's (`terminal/log.ts`), so a Svelte
	   console and a plain-DOM `createLogPane` hold the same lines the same way.

	   Two objects, because they vary apart:
	   - `ConsoleLog` is a buffer to append to, for a console that is fed. A
	     console whose lines are derived (from issues, from a trace) passes its
	     own array instead and needs no log.
	   - `ConsoleView` is what the reader chose to see. It is its own object so
	     several consoles side by side can share one: one bar, every pane
	     filtered alike. */

	import { getContext, setContext } from "svelte";
	import { SvelteSet } from "svelte/reactivity";

	import {
		appendEntry,
		collapseEntries,
		filterEntries,
		LOG_LEVELS,
		type LogEntry,
		type LogInput,
		type LogLevel,
	} from "@samthesomebody/kit/terminal/log.ts";
	import type { TerminalLinksPort } from "@samthesomebody/kit/terminal/types.ts";

	export type { LogEntry, LogInput, LogLevel } from "@samthesomebody/kit/terminal/log.ts";

	/** Lines held by a {@link ConsoleLog}: a boot plus a few rounds, with room to spare. */
	const DEFAULT_LIMIT = 2000;

	/** A console's own buffer: appends collapse immediate repeats, Clear keeps standing lines. */
	export class ConsoleLog {
		entries = $state.raw<readonly LogEntry[]>([]);
		readonly #limit: number;
		#sequence = 0;

		constructor(options: { readonly limit?: number } = {}) {
			this.#limit = options.limit ?? DEFAULT_LIMIT;
		}

		append(input: LogInput): void {
			this.#sequence += 1;
			this.entries = appendEntry(this.entries, input, this.#limit, this.#sequence);
		}

		clear(): void {
			this.entries = this.entries.filter((entry) => entry.standing === true);
		}
	}

	/** What the reader chose to see: levels, a text filter, and whether every repeat folds. */
	export class ConsoleView {
		readonly levels: SvelteSet<LogLevel>;
		text = $state("");
		collapse = $state(false);

		constructor(options: { readonly levels?: readonly LogLevel[]; readonly collapse?: boolean } = {}) {
			this.levels = new SvelteSet(options.levels ?? LOG_LEVELS);
			this.collapse = options.collapse ?? false;
		}

		toggle(level: LogLevel): void {
			if (this.levels.has(level)) this.levels.delete(level);
			else this.levels.add(level);
		}

		/** The lines to draw, oldest first. */
		shown(entries: readonly LogEntry[]): readonly LogEntry[] {
			const filtered = filterEntries(entries, { levels: this.levels, text: this.text });
			return this.collapse ? collapseEntries(filtered) : filtered;
		}
	}

	/** What the parts share. Read through getters: every field is live. */
	export interface ConsoleContext {
		readonly entries: readonly LogEntry[];
		readonly shown: readonly LogEntry[];
		readonly counts: Record<LogLevel, number>;
		readonly view: ConsoleView;
		readonly picked: LogEntry | undefined;
		readonly links: TerminalLinksPort | undefined;
		/** Undefined when the console has nothing to clear. */
		readonly clear: (() => void) | undefined;
		/** Undefined when lines aren't pickable. */
		readonly pick: ((entry: LogEntry) => void) | undefined;
		/** Following the newest line. The lines set it; the bar offers "latest" when it is false. */
		pinned: boolean;
		/** Set by the lines: scroll to the newest line and follow it again. */
		jump: () => void;
	}

	const KEY = Symbol("kit-console");

	export const setConsoleContext = (context: ConsoleContext): void => {
		setContext(KEY, context);
	};

	export const getConsoleContext = (): ConsoleContext => {
		const context = getContext<ConsoleContext | undefined>(KEY);
		if (context === undefined) throw new Error("Console parts go inside <Console>");
		return context;
	};
</script>

<script lang="ts">
	import type { Snippet } from "svelte";

	import { countByLevel, entryKey } from "@samthesomebody/kit/terminal/log.ts";

	import "@samthesomebody/kit/terminal/log.css";

	/* A CONSOLE IS COMPOSED. This is the root: it holds the lines, the view
	   and the picked line, and draws nothing but the frame. What else it is
	   comes from its children —
	     minimal      <Console {entries}><ConsoleLines /></Console>
	     filtering    + <ConsoleBar /> above the lines
	     input        + <ConsoleInput onsubmit={…} /> below them
	     detail       + <ConsoleDetail /> for the picked line in full
	     multi-pane   several Consoles in Columns, sharing one `view`
	   It draws with the log pane's own sheet, so it reads exactly like
	   `createLogPane` wherever both appear. */
	let {
		entries,
		view = new ConsoleView(),
		selected = $bindable(),
		onpick,
		onclear,
		links,
		children,
	}: {
		/** Oldest first. A `ConsoleLog`'s `entries`, or a list the tool derives. */
		entries: readonly LogEntry[];
		/** Pass one to share the reader's filter between consoles. */
		view?: ConsoleView;
		/** The picked line's key (`entryKey`). */
		selected?: string;
		/** Makes lines pickable; called with the line picked. */
		onpick?: (entry: LogEntry) => void;
		/** Makes the bar offer Clear. */
		onclear?: () => void;
		/** Makes URLs and file paths in lines clickable. */
		links?: TerminalLinksPort;
		children: Snippet;
	} = $props();

	const shown = $derived(view.shown(entries));
	const counts = $derived(countByLevel(entries));
	const picked = $derived(entries.find((entry) => entryKey(entry) === selected));
	let pinned = $state(true);
	let jump = $state<() => void>(() => {});

	setConsoleContext({
		get entries() {
			return entries;
		},
		get shown() {
			return shown;
		},
		get counts() {
			return counts;
		},
		get view() {
			return view;
		},
		get picked() {
			return picked;
		},
		get links() {
			return links;
		},
		get clear() {
			return onclear;
		},
		get pick() {
			if (onpick === undefined) return undefined;
			return (entry: LogEntry) => {
				selected = entryKey(entry);
				onpick?.(entry);
			};
		},
		get pinned() {
			return pinned;
		},
		set pinned(value) {
			pinned = value;
		},
		get jump() {
			return jump;
		},
		set jump(value) {
			jump = value;
		},
	});
</script>

<div class="log-pane kit-console">
	{@render children()}
</div>
