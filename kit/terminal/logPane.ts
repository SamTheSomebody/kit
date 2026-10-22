/**
 * The log pane — the console kit's structured half (`log.ts` says why there
 * are two).
 *
 * Plain DOM, like every other kit in `play/`: it mounts through a dock
 * tab's `render(element)` and knows nothing about the framework around it.
 *
 * Three shapes are forced by the dock, and they are the same three the VT
 * pane lives with:
 *
 * 1. **The pane exists before its host element.** Entries arrive while the
 *    tab is inactive — a boot error is the whole point — so `append` works
 *    with no DOM at all and `mount` only attaches a view.
 * 2. **`mount` is re-entrant.** The dock re-parents content rather than
 *    rebuilding it, so everything the pane owns lives in one root it keeps
 *    for its lifetime.
 * 3. **A re-parented element's `scrollTop` goes back to zero.** The pane
 *    records where it was and puts it back, which is what lets the log run
 *    OLDEST FIRST like every console the reader has ever used — the old
 *    compare list ran newest-first purely to survive this.
 */

import { matchTerminalLinks } from "./links.ts";
import {
	appendEntry,
	clockText,
	countByLevel,
	filterEntries,
	isPinnedToBottom,
	LOG_LEVELS,
	logText,
	type LogEntry,
	type LogInput,
	type LogLevel,
} from "./log.ts";

import "./log.css";
import type { TerminalLinksPort } from "./types.ts";

/** Entries held per pane. A boot plus a few rounds, with room to spare. */
const DEFAULT_LIMIT = 2000;

export type LogPanePorts = {
	/** A clicked URL or file path. Absent = the text is not clickable. */
	links?: TerminalLinksPort;
	/** Transient messages — "copied". The kit renders no toasts of its own. */
	on?: { notify?(text: string): void };
	limit?: number;
	/** What an empty pane says. A log with nothing in it is usually fine. */
	emptyText?: string;
	/** Levels shown at first. Defaults to all of them. */
	levels?: readonly LogLevel[];
	/** The reader cleared it. A tap that owns a buffer drops that too. */
	onclear?: () => void;
};

export type LogPaneHandle = {
	mount(element: HTMLElement): void;
	unmount(): void;
	append(entry: LogInput): void;
	clear(): void;
	/** Oldest first, as plain text — for copy-all and for tests. */
	text(): string;
	/** How many are held, before the filter. */
	size(): number;
	destroy(): void;
};

const element = <T extends HTMLElement>(tag: string, className: string, text?: string): T => {
	const node = document.createElement(tag) as T;
	node.className = className;
	if (text !== undefined) {
		node.textContent = text;
	}
	return node;
};

export const createLogPane = (ports: LogPanePorts = {}): LogPaneHandle => {
	const limit = ports.limit ?? DEFAULT_LIMIT;
	let entries: readonly LogEntry[] = [];
	let sequence = 0;
	const levels = new Set<LogLevel>(ports.levels ?? LOG_LEVELS);
	let needle = "";
	/* Where the reader had scrolled to, kept across a re-parent. */
	let savedScroll = 0;
	let pinned = true;

	const root = element<HTMLDivElement>("div", "log-pane");
	root.dataset["dev"] = "log-pane";

	// ── the bar ────────────────────────────────────────────────────────────
	const bar = element<HTMLDivElement>("div", "log-bar");
	const clearButton = element<HTMLButtonElement>("button", "log-clear", "⃠");
	clearButton.type = "button";
	clearButton.title = "Clear the console";
	clearButton.setAttribute("aria-label", "Clear the console");

	const filterInput = document.createElement("input");
	filterInput.type = "search";
	filterInput.className = "log-filter";
	filterInput.placeholder = "Filter";
	filterInput.setAttribute("aria-label", "Filter console output");
	filterInput.dataset["dev"] = "log-filter";

	/* One latching key per level, each carrying its own count — the level
	   filter and the "how bad is it" readout are the same control, because
	   they answer with the same number. */
	const levelKeys = new Map<LogLevel, HTMLButtonElement>();
	const levelGroup = element<HTMLDivElement>("div", "log-levels");
	for (const level of LOG_LEVELS) {
		const key = element<HTMLButtonElement>("button", `log-level ${level}`);
		key.type = "button";
		key.dataset["dev"] = `log-level-${level}`;
		key.addEventListener("click", () => {
			if (levels.has(level)) {
				levels.delete(level);
			} else {
				levels.add(level);
			}
			render();
		});
		levelKeys.set(level, key);
		levelGroup.append(key);
	}

	const jumpButton = element<HTMLButtonElement>("button", "log-jump", "↓ latest");
	jumpButton.type = "button";
	jumpButton.hidden = true;
	jumpButton.title = "Scroll to the newest line and follow it again";

	bar.append(clearButton, filterInput, levelGroup, jumpButton);

	// ── the list ───────────────────────────────────────────────────────────
	const view = element<HTMLDivElement>("div", "log-view kit-scrollport");
	const list = element<HTMLOListElement>("ol", "log-lines");
	view.append(list);
	const empty = element<HTMLParagraphElement>("p", "log-empty", ports.emptyText ?? "Nothing logged yet.");
	view.append(empty);
	root.append(bar, view);

	view.addEventListener("scroll", () => {
		savedScroll = view.scrollTop;
		pinned = isPinnedToBottom(view);
		jumpButton.hidden = pinned;
	});

	jumpButton.addEventListener("click", () => {
		pinned = true;
		jumpButton.hidden = true;
		view.scrollTop = view.scrollHeight;
		savedScroll = view.scrollTop;
	});

	clearButton.addEventListener("click", () => {
		entries = [];
		pinned = true;
		ports.onclear?.();
		render();
	});

	filterInput.addEventListener("input", () => {
		needle = filterInput.value;
		render();
	});

	/**
	 * One line's text, with its URLs and file paths as links.
	 *
	 * Same matcher the VT pane uses, so a path is clickable in exactly the
	 * same places whichever pane it lands in. Built by walking the spans and
	 * appending text nodes between them — never `innerHTML`, because this text
	 * came out of a game's `console` and is not ours to trust as markup.
	 */
	const textOf = (entry: LogEntry): HTMLElement => {
		const holder = element<HTMLSpanElement>("span", "log-text");
		const open = ports.links?.open;
		if (!open) {
			holder.textContent = entry.text;
			return holder;
		}
		let cursor = 0;
		for (const match of matchTerminalLinks(entry.text)) {
			if (match.start > cursor) {
				holder.append(entry.text.slice(cursor, match.start));
			}
			const anchor = element<HTMLButtonElement>("button", "log-link", match.text);
			anchor.type = "button";
			anchor.title = ports.links?.describe?.(match.target) ?? match.text;
			anchor.addEventListener("click", () => open(match.target));
			holder.append(anchor);
			cursor = match.end;
		}
		if (cursor < entry.text.length) {
			holder.append(entry.text.slice(cursor));
		}
		return holder;
	};

	const lineOf = (entry: LogEntry): HTMLLIElement => {
		const line = element<HTMLLIElement>("li", `log-line ${entry.level}`);
		line.append(element<HTMLSpanElement>("span", "log-at", entry.at));
		line.append(textOf(entry));
		const trailing = element<HTMLSpanElement>("span", "log-trailing");
		if (entry.repeats > 1) {
			const badge = element<HTMLSpanElement>("span", "log-repeats", `×${entry.repeats}`);
			badge.title = `this line arrived ${entry.repeats} times in a row`;
			trailing.append(badge);
		}
		if (entry.source) {
			trailing.append(element<HTMLSpanElement>("span", "log-source", entry.source));
		}
		if (trailing.childElementCount > 0) {
			line.append(trailing);
		}
		return line;
	};

	/**
	 * Redraw.
	 *
	 * Wholesale rather than incremental, and that is a measured decision
	 * rather than laziness: a level toggle or a filter keystroke changes which
	 * lines exist at all, so an append-only path would need a second code path
	 * for the common case and both would have to agree. At the 2000-line cap
	 * the whole list is one `replaceChildren` of DOM the browser builds in a
	 * frame — and the pane only redraws when something actually changed.
	 */
	const render = (): void => {
		const shown = filterEntries(entries, { levels, text: needle });
		const counts = countByLevel(entries);
		for (const [level, key] of levelKeys) {
			const count = counts[level];
			key.textContent = `${level} ${count}`;
			key.setAttribute("aria-pressed", String(levels.has(level)));
			key.title = levels.has(level)
				? `${count} ${level} line(s) — click to hide them`
				: `${count} ${level} line(s), hidden — click to show them`;
			/* A level with nothing in it is still a control, but it should not
			   compete with one that has forty errors behind it. */
			key.classList.toggle("quiet", count === 0);
		}

		list.replaceChildren(...shown.map(lineOf));
		const nothing = shown.length === 0;
		empty.hidden = !nothing;
		empty.textContent =
			entries.length === 0
				? (ports.emptyText ?? "Nothing logged yet.")
				: "Every line is filtered out — widen the filter or turn a level back on.";
		list.hidden = nothing;

		if (pinned) {
			view.scrollTop = view.scrollHeight;
			savedScroll = view.scrollTop;
			jumpButton.hidden = true;
		} else {
			view.scrollTop = savedScroll;
			jumpButton.hidden = false;
		}
	};

	render();

	return {
		mount: (host) => {
			host.append(root);
			/* The re-parent that just happened reset the scroll. Put it back —
			   this is the whole reason the log can run oldest-first. */
			if (pinned) {
				view.scrollTop = view.scrollHeight;
			} else {
				view.scrollTop = savedScroll;
			}
		},
		unmount: () => root.remove(),
		append: (input) => {
			sequence += 1;
			entries = appendEntry(entries, { ...input, at: input.at ?? clockText(new Date()) }, limit, sequence);
			render();
		},
		clear: () => {
			entries = [];
			pinned = true;
			render();
		},
		text: () => logText(entries),
		size: () => entries.length,
		destroy: () => root.remove(),
	};
};
