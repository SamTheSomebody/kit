/**
 * Terminal kit model + port types — the console's data contract
 * (`docs/specs/2026-09-04-terminal-kit-design.md` §Ports).
 *
 * The pane is a SINK, not a client: a consumer owns its own transport and
 * pushes bytes in with `write`. That is what makes the kit reusable across
 * tools whose wires have nothing in common — the lobby streams a spawned
 * child over `fetch`, a game shell could pipe its own log in, and neither
 * has to agree on a protocol with the other. Everything that travels the
 * other way — a keystroke, an interrupt, a clicked path — leaves through a
 * port, so the pane never learns what a run, a file or an editor is.
 */

/**
 * What a key bind can ask the host process for: `int` is Ctrl-C, `quit` is
 * Ctrl-\, and `term` is Ctrl-Z.
 *
 * Ctrl-Z is SIGTSTP in a terminal — suspend, then `fg`. This pane has no PTY
 * and therefore no job control, so a suspended job could never be resumed
 * from here and the console would simply hang on it. The keystroke means
 * "stop what is running" either way, so it is wired to the strongest stop
 * this side of the wire can honestly deliver, and the legend says so.
 */
export type TerminalSignal = "int" | "term" | "quit";

/** A clicked link. Paths stay strings — resolving one against a repo root,
 *  an editor or a browser tab is the consumer's business, not the pane's. */
export type TerminalLinkTarget =
	| { kind: "url"; url: string }
	| { kind: "path"; path: string; line?: number; column?: number };

/** The process behind the pane. Every member is optional: a pane over a
 *  finished run, or over output nobody owns (an external process the tool
 *  only mirrors), is read-only, and the key binds that would need one of
 *  these go quiet rather than lying about what they do. */
export type TerminalSessionPort = {
	/** Typed or pasted input. Absent = read-only pane (stdin is disabled). */
	input?(text: string): void;
	/** Ctrl-C and friends. Absent = the interrupt bind does nothing. */
	signal?(name: TerminalSignal): void;
};

export type TerminalLinksPort = {
	/** A link was clicked. */
	open(target: TerminalLinkTarget): void;
	/** Hover text. Defaults to the underlying text plus a modifier hint. */
	describe?(target: TerminalLinkTarget): string;
};

export type TerminalEventsPort = {
	/** Transient message — "copied", "no matches". The kit renders none of
	 *  its own toasts, exactly as the dock kit renders none: the tool owns
	 *  that surface (`ui` `Notification`). */
	notify?(text: string): void;
	/** Fired after the pane resizes, in cells — a PTY consumer forwards this
	 *  as a window-size change. */
	resize?(size: { columns: number; rows: number }): void;
};

export type TerminalPorts = {
	session?: TerminalSessionPort;
	links?: TerminalLinksPort;
	on?: TerminalEventsPort;
	/** Scrollback lines held per pane. Default 10 000 — a `pnpm verify` run
	 *  is a few thousand lines and truncating one is worse than the memory. */
	scrollback?: number;
};

/** What a key bind resolved to. `null` means "not ours" — the event falls
 *  through to the terminal, which is what makes an unbound key reach the
 *  process instead of being eaten. */
export type TerminalAction =
	| "copy"
	| "interrupt"
	| "terminate"
	| "quit"
	| "endOfFile"
	| "clear"
	| "find"
	| "findNext"
	| "findPrevious"
	| "closeFind"
	| "selectAll"
	| "scrollPageUp"
	| "scrollPageDown"
	| "scrollToBottom";

/** The subset of `KeyboardEvent` the bind table reads, so the table is a
 *  pure function and testable without a DOM. */
export type TerminalKeyEvent = {
	key: string;
	ctrlKey: boolean;
	metaKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
	type?: string;
};

export type TerminalKeyContext = {
	/** Ctrl-C copies a selection and interrupts without one — the rule every
	 *  terminal-in-a-browser lands on, because the browser has no other way
	 *  to tell the two intents apart. */
	hasSelection: boolean;
	/** `true` on macOS, where Cmd carries the app binds and Ctrl belongs to
	 *  the process. */
	appleKeyboard: boolean;
	/** The find bar is open, so Escape and Enter belong to it. */
	finding: boolean;
};

export type TerminalPaneHandle = {
	/** Put the pane in `element`. Safe to call again after `unmount` — the
	 *  emulator and its scrollback are created once and survive a move, which
	 *  is what the dock's re-render needs (it re-parents content, and a pane
	 *  that lost its buffer on every tab click would be useless). */
	mount(element: HTMLElement): void;
	unmount(): void;
	/** Raw bytes from the process — escape sequences and all. */
	write(chunk: string): void;
	clear(): void;
	focus(): void;
	/** Re-measure against the host box. Called automatically on resize. */
	fit(): void;
	openFind(query?: string): void;
	closeFind(): void;
	hasSelection(): boolean;
	copySelection(): Promise<void>;
	scrollToBottom(): void;
	/** The whole scrollback as plain text — for "copy all" and for tests. */
	text(): string;
	destroy(): void;
};
