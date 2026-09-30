/**
 * Key binds — a pure table
 * (`docs/specs/2026-09-04-terminal-kit-design.md` §Key binds).
 *
 * `null` is the important return: it means "not ours", and the keystroke
 * falls through to the emulator and on to the process. A console that ate
 * unbound keys would be a console you cannot type into, so the table stays
 * deliberately small — everything it does not name belongs to the child.
 *
 * The platform split follows the terminals people already use: on macOS the
 * app binds live on Cmd and Ctrl belongs to the process, everywhere else the
 * app binds take Ctrl-Shift and bare Ctrl belongs to the process. Ctrl-C is
 * the one bind on both sides of that line, and it is resolved by selection:
 * with text selected it copies, without it interrupts. The browser gives us
 * no other way to tell those two intents apart, and every terminal in a
 * browser lands on the same rule.
 *
 * Paste is absent on purpose. The emulator owns a hidden textarea, so the
 * platform's own paste already arrives as input — binding it here would take
 * a working native path and replace it with a clipboard permission prompt.
 */

import type { TerminalAction, TerminalKeyContext, TerminalKeyEvent } from "./types.ts";

const APP_MODIFIER = (event: TerminalKeyEvent, context: TerminalKeyContext): boolean =>
	context.appleKeyboard ? event.metaKey && !event.ctrlKey : event.ctrlKey && event.shiftKey;

const BARE_CONTROL = (event: TerminalKeyEvent): boolean =>
	event.ctrlKey && !event.shiftKey && !event.metaKey && !event.altKey;

export const resolveTerminalKey = (event: TerminalKeyEvent, context: TerminalKeyContext): TerminalAction | null => {
	if (event.type !== undefined && event.type !== "keydown") {
		return null;
	}
	const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

	/* The find bar has first claim on Escape and Enter while it is open —
	   otherwise Escape would reach the process as \x1b and close nothing. */
	if (context.finding) {
		if (key === "Escape") {
			return "closeFind";
		}
		if (key === "Enter") {
			return event.shiftKey ? "findPrevious" : "findNext";
		}
	}

	if (key === "F3") {
		return event.shiftKey ? "findPrevious" : "findNext";
	}

	if (APP_MODIFIER(event, context)) {
		if (key === "c") {
			return "copy";
		}
		if (key === "f") {
			return "find";
		}
		if (key === "k") {
			return "clear";
		}
		if (key === "a") {
			return "selectAll";
		}
		if (key === "g") {
			return event.shiftKey ? "findPrevious" : "findNext";
		}
	}

	/* Ctrl-F with no Shift: on macOS that is the process's own "forward
	   character", so it is left alone there and taken only elsewhere, where
	   it would otherwise open the BROWSER's find over a buffer the browser
	   cannot see. */
	if (!context.appleKeyboard && BARE_CONTROL(event) && key === "f") {
		return "find";
	}

	if (BARE_CONTROL(event)) {
		if (key === "c") {
			return context.hasSelection ? "copy" : "interrupt";
		}
		if (key === "d") {
			return "endOfFile";
		}
		if (key === "l") {
			return "clear";
		}
		/* The rest of the stop ladder. Ctrl-\ is SIGQUIT, as it is anywhere.
		   Ctrl-Z is SIGTSTP in a terminal, and a pane with no PTY has no job
		   control to resume a suspended job with — so it terminates instead,
		   which is what the keystroke means to the hand that presses it. */
		if (key === "z") {
			return "terminate";
		}
		if (key === "\\") {
			return "quit";
		}
	}

	if (event.shiftKey && !event.ctrlKey && !event.metaKey) {
		if (key === "PageUp") {
			return "scrollPageUp";
		}
		if (key === "PageDown") {
			return "scrollPageDown";
		}
		if (key === "End") {
			return "scrollToBottom";
		}
	}

	return null;
};

/** Human-readable bind list — for a tool that wants to show a legend. */
export const terminalKeyLegend = (appleKeyboard: boolean): { keys: string; does: string }[] => {
	const app = appleKeyboard ? "⌘" : "Ctrl+Shift+";
	return [
		{ keys: "Ctrl+C", does: "copy when text is selected, interrupt when it is not" },
		{ keys: "Ctrl+Z", does: "stop what is running — no job control here, so it terminates rather than suspends" },
		{ keys: "Ctrl+\\", does: "quit what is running (SIGQUIT)" },
		{ keys: "Ctrl+D", does: "end of input" },
		{ keys: `${app}C`, does: "copy" },
		{ keys: `${app}F`, does: "find" },
		{ keys: `${app}K`, does: "clear" },
		{ keys: `${app}A`, does: "select all" },
		{ keys: "F3 / Shift+F3", does: "next / previous match" },
		{ keys: "Shift+PageUp / PageDown", does: "scroll a page" },
		{ keys: "Shift+End", does: "back to the tail" },
	];
};
