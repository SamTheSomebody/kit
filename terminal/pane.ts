/**
 * The console pane — an xterm emulator dressed in `--tool-*`, wired to the
 * kit's ports (`docs/specs/2026-09-04-terminal-kit-design.md` §Pane).
 *
 * Two shapes matter here, both forced by how the dock renders content:
 *
 * 1. **The emulator is created with the pane, not with its host element.**
 *    A run's output starts arriving before anyone clicks its tab, and the
 *    scrollback has to be there when they do. `write` works with no DOM at
 *    all; `mount` only attaches a renderer.
 * 2. **`mount` is re-entrant.** The dock re-renders its whole tree on any
 *    structural change and re-parents content to match, so a pane is moved,
 *    not rebuilt. Everything the emulator owns lives in one root element the
 *    pane keeps for its lifetime, and moving that root costs a re-measure.
 *
 * The pane is fed by pipes, not a PTY (spec §Process model), which decides
 * two settings: `convertEol`, because a pipe has no ONLCR to turn a bare
 * `\n` into a carriage return and output would otherwise staircase down the
 * screen; and `disableStdin` whenever no `input` port was handed in, so a
 * read-only pane does not pretend to accept typing.
 */

import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon, type ISearchDecorationOptions } from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { Terminal, type ILink } from "@xterm/xterm";

import { logicalLineAt } from "./buffer.ts";
import { resolveTerminalKey } from "./keys.ts";
import { matchTerminalLinks } from "./links.ts";
import { terminalMetricsOf, terminalSearchThemeOf, terminalThemeOf } from "./theme.ts";
import type { TerminalAction, TerminalPaneHandle, TerminalPorts } from "./types.ts";

const DEFAULT_SCROLLBACK = 10_000;

/** Ctrl-D. A pipe has no line discipline, so end-of-input is a byte we send. */
const END_OF_TRANSMISSION = "\u0004";

const appleKeyboard = (): boolean => /mac|iphone|ipad/i.test(globalThis.navigator?.userAgent ?? "");

export const createTerminalPane = (ports: TerminalPorts = {}): TerminalPaneHandle => {
	const { session, links, on } = ports;
	const ownerDocument = globalThis.document;

	const root = ownerDocument.createElement("div");
	root.className = "terminal-pane";
	const screen = ownerDocument.createElement("div");
	screen.className = "terminal-screen";
	root.append(screen);

	const terminal = new Terminal({
		scrollback: ports.scrollback ?? DEFAULT_SCROLLBACK,
		convertEol: true,
		cursorBlink: false,
		disableStdin: session?.input === undefined,
		allowProposedApi: true,
		drawBoldTextInBrightColors: true,
	});
	const fitAddon = new FitAddon();
	const searchAddon = new SearchAddon();
	terminal.loadAddon(fitAddon);
	terminal.loadAddon(searchAddon);
	// Unicode 11: house tool glyphs (✓ ➜) match v6; child emoji (✅ 😀) do not.
	// Prove: tests/unicodeWidth.test.ts. The pane is a sink, so the addon stays.
	terminal.loadAddon(new Unicode11Addon());
	terminal.unicode.activeVersion = "11";

	if (session?.input !== undefined) {
		terminal.onData((data) => session.input?.(data));
	}

	/* ── find bar ── */
	const findBar = ownerDocument.createElement("div");
	findBar.className = "terminal-find";
	findBar.hidden = true;
	const findInput = ownerDocument.createElement("input");
	findInput.type = "text";
	findInput.placeholder = "Find";
	findInput.setAttribute("aria-label", "Find in console output");
	const findCount = ownerDocument.createElement("span");
	findCount.className = "terminal-find-count";
	const previousButton = ownerDocument.createElement("button");
	previousButton.type = "button";
	previousButton.textContent = "↑";
	previousButton.title = "Previous match (Shift+F3)";
	const nextButton = ownerDocument.createElement("button");
	nextButton.type = "button";
	nextButton.textContent = "↓";
	nextButton.title = "Next match (F3)";
	const closeButton = ownerDocument.createElement("button");
	closeButton.type = "button";
	closeButton.textContent = "✕";
	closeButton.title = "Close (Esc)";
	findBar.append(findInput, findCount, previousButton, nextButton, closeButton);
	root.append(findBar);

	searchAddon.onDidChangeResults(({ resultIndex, resultCount }) => {
		findCount.textContent = resultCount === 0 ? "no matches" : `${resultIndex + 1}/${resultCount}`;
	});

	/* Resolved once the pane has a cascade to read — same moment as the
	   theme, and for the same reason. */
	let searchDecorations: ISearchDecorationOptions | undefined;

	const search = (direction: "next" | "previous"): void => {
		const query = findInput.value;
		if (query === "") {
			searchAddon.clearDecorations();
			findCount.textContent = "";
			return;
		}
		const options = searchDecorations === undefined ? undefined : { decorations: searchDecorations };
		const found =
			direction === "next" ? searchAddon.findNext(query, options) : searchAddon.findPrevious(query, options);
		if (!found) {
			findCount.textContent = "No matches";
		}
	};

	const closeFind = (): void => {
		findBar.hidden = true;
		searchAddon.clearDecorations();
		findCount.textContent = "";
		terminal.focus();
	};

	const openFind = (query?: string): void => {
		findBar.hidden = false;
		if (query !== undefined) {
			findInput.value = query;
		}
		findInput.focus();
		findInput.select();
		if (findInput.value !== "") {
			search("next");
		}
	};

	findInput.addEventListener("input", () => search("next"));
	nextButton.addEventListener("click", () => search("next"));
	previousButton.addEventListener("click", () => search("previous"));
	closeButton.addEventListener("click", () => closeFind());
	findInput.addEventListener("keydown", (event: KeyboardEvent) => {
		if (event.key === "Escape") {
			event.preventDefault();
			closeFind();
			return;
		}
		if (event.key !== "Enter") {
			return;
		}
		event.preventDefault();
		search(event.shiftKey ? "previous" : "next");
	});

	/* ── links ── */
	terminal.registerLinkProvider({
		provideLinks(bufferLineNumber: number, callback: (found: ILink[] | undefined) => void): void {
			const buffer = terminal.buffer.active;
			const { firstRow, text } = logicalLineAt((index) => buffer.getLine(index), bufferLineNumber - 1);
			const matches = matchTerminalLinks(text);
			if (matches.length === 0) {
				callback(undefined);
				return;
			}
			const columns = terminal.cols;
			const position = (offset: number): { x: number; y: number } => ({
				x: (offset % columns) + 1,
				y: firstRow + Math.floor(offset / columns) + 1,
			});
			callback(
				matches.map((match) => ({
					text: match.text,
					range: { start: position(match.start), end: position(match.end - 1) },
					activate: () => links?.open(match.target),
					decorations: { pointerCursor: true, underline: true },
				})),
			);
		},
	});

	/* ── actions ── */
	const copySelection = async (): Promise<void> => {
		const selection = terminal.getSelection();
		if (selection === "") {
			return;
		}
		try {
			await globalThis.navigator.clipboard.writeText(selection);
			on?.notify?.("copied");
		} catch {
			/* Clipboard access is a permission, and a denied one is a fact
			   the reader needs — their Ctrl-C did nothing. */
			on?.notify?.("clipboard blocked");
		}
	};

	const perform = (action: TerminalAction): void => {
		switch (action) {
			case "copy": {
				copySelection().catch((error) => console.error(error));
				return;
			}
			case "interrupt": {
				session?.signal?.("int");
				return;
			}
			case "terminate": {
				session?.signal?.("term");
				return;
			}
			case "quit": {
				session?.signal?.("quit");
				return;
			}
			case "endOfFile": {
				session?.input?.(END_OF_TRANSMISSION);
				return;
			}
			case "clear": {
				terminal.clear();
				return;
			}
			case "find": {
				openFind(terminal.hasSelection() ? terminal.getSelection() : undefined);
				return;
			}
			case "findNext": {
				if (findBar.hidden) {
					openFind();
				} else {
					search("next");
				}
				return;
			}
			case "findPrevious": {
				if (findBar.hidden) {
					openFind();
				} else {
					search("previous");
				}
				return;
			}
			case "closeFind": {
				closeFind();
				return;
			}
			case "selectAll": {
				terminal.selectAll();
				return;
			}
			case "scrollPageUp": {
				terminal.scrollPages(-1);
				return;
			}
			case "scrollPageDown": {
				terminal.scrollPages(1);
				return;
			}
			case "scrollToBottom": {
				terminal.scrollToBottom();
				return;
			}
		}
	};

	terminal.attachCustomKeyEventHandler((event: KeyboardEvent): boolean => {
		const action = resolveTerminalKey(event, {
			hasSelection: terminal.hasSelection(),
			appleKeyboard: appleKeyboard(),
			finding: !findBar.hidden,
		});
		if (action === null) {
			return true;
		}
		event.preventDefault();
		event.stopPropagation();
		perform(action);
		return false;
	});

	/* ── sizing ── */
	let opened = false;

	const fit = (): void => {
		if (!opened) {
			return;
		}
		if (root.clientWidth === 0 || root.clientHeight === 0) {
			return;
		}
		const before = { columns: terminal.cols, rows: terminal.rows };
		fitAddon.fit();
		if (terminal.cols === before.columns && terminal.rows === before.rows) {
			return;
		}
		on?.resize?.({ columns: terminal.cols, rows: terminal.rows });
	};

	/* The dock parks un-rendered content in a zero-sized box, so a pane can
	   be mounted long before it has one cell of room. Opening the emulator
	   there would measure a 0×0 grid; it waits for the first real box
	   instead, and the observer is what delivers it. Reading the theme here
	   rather than at construction is the same story — the tokens only mean
	   something once the root is inside the tool's cascade. */
	const openWhenSized = (): void => {
		if (opened) {
			return;
		}
		if (root.clientWidth === 0 || root.clientHeight === 0) {
			return;
		}
		terminal.options.theme = terminalThemeOf(root);
		searchDecorations = terminalSearchThemeOf(root);
		const metrics = terminalMetricsOf(root);
		terminal.options.fontFamily = metrics.fontFamily;
		terminal.options.fontSize = metrics.fontSize;
		terminal.options.lineHeight = metrics.lineHeight;
		terminal.open(screen);
		opened = true;
		fit();
	};

	const observer = new ResizeObserver(() => {
		openWhenSized();
		fit();
	});

	return {
		mount(element: HTMLElement): void {
			element.append(root);
			observer.observe(root);
			openWhenSized();
			fit();
		},
		unmount(): void {
			observer.unobserve(root);
			root.remove();
		},
		write(chunk: string): void {
			terminal.write(chunk);
		},
		clear(): void {
			terminal.clear();
		},
		focus(): void {
			terminal.focus();
		},
		fit,
		openFind,
		closeFind,
		hasSelection: () => terminal.hasSelection(),
		copySelection,
		scrollToBottom: () => terminal.scrollToBottom(),
		text(): string {
			const buffer = terminal.buffer.active;
			const lines: string[] = [];
			for (let index = 0; index < buffer.length; index += 1) {
				lines.push(buffer.getLine(index)?.translateToString(true) ?? "");
			}
			return `${lines.join("\n").replace(/\n+$/, "")}\n`;
		},
		destroy(): void {
			observer.disconnect();
			terminal.dispose();
			root.remove();
		},
	};
};
