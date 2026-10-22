import { describe, expect, it } from "vitest";

import { resolveTerminalKey } from "../keys.ts";
import type { TerminalKeyContext, TerminalKeyEvent } from "../types.ts";

const press = (key: string, modifiers: Partial<TerminalKeyEvent> = {}): TerminalKeyEvent => ({
	key,
	ctrlKey: false,
	metaKey: false,
	shiftKey: false,
	altKey: false,
	type: "keydown",
	...modifiers,
});

const context = (overrides: Partial<TerminalKeyContext> = {}): TerminalKeyContext => ({
	hasSelection: false,
	appleKeyboard: false,
	finding: false,
	...overrides,
});

describe("resolveTerminalKey", () => {
	it("resolves Ctrl-C by whether anything is selected", () => {
		expect(resolveTerminalKey(press("c", { ctrlKey: true }), context())).toBe("interrupt");
		expect(resolveTerminalKey(press("c", { ctrlKey: true }), context({ hasSelection: true }))).toBe("copy");
	});

	it("leaves an unbound key to the process", () => {
		expect(resolveTerminalKey(press("a"), context())).toBeNull();
		expect(resolveTerminalKey(press("a", { ctrlKey: true }), context())).toBeNull();
		expect(resolveTerminalKey(press("b", { ctrlKey: true }), context())).toBeNull();
	});

	it("binds the rest of the stop ladder", () => {
		// Ctrl-Z is SIGTSTP in a terminal; with no job control to resume a
		// suspended job, the pane's strongest honest stop is a terminate.
		expect(resolveTerminalKey(press("z", { ctrlKey: true }), context())).toBe("terminate");
		expect(resolveTerminalKey(press("\\", { ctrlKey: true }), context())).toBe("quit");
		// Still the process's, with the app modifier on top.
		expect(resolveTerminalKey(press("z", { ctrlKey: true, shiftKey: true }), context())).toBeNull();
		expect(resolveTerminalKey(press("z", { metaKey: true }), context({ appleKeyboard: true }))).toBeNull();
	});

	it("puts the app binds on Cmd for an Apple keyboard and Ctrl-Shift elsewhere", () => {
		expect(resolveTerminalKey(press("f", { metaKey: true }), context({ appleKeyboard: true }))).toBe("find");
		expect(resolveTerminalKey(press("f", { ctrlKey: true, shiftKey: true }), context())).toBe("find");
		expect(resolveTerminalKey(press("k", { metaKey: true }), context({ appleKeyboard: true }))).toBe("clear");
		expect(resolveTerminalKey(press("k", { ctrlKey: true, shiftKey: true }), context())).toBe("clear");
	});

	it("takes bare Ctrl-F only where it is not the process's own bind", () => {
		expect(resolveTerminalKey(press("f", { ctrlKey: true }), context())).toBe("find");
		expect(resolveTerminalKey(press("f", { ctrlKey: true }), context({ appleKeyboard: true }))).toBeNull();
	});

	it("gives Escape and Enter to the find bar only while it is open", () => {
		expect(resolveTerminalKey(press("Escape"), context({ finding: true }))).toBe("closeFind");
		expect(resolveTerminalKey(press("Enter"), context({ finding: true }))).toBe("findNext");
		expect(resolveTerminalKey(press("Enter", { shiftKey: true }), context({ finding: true }))).toBe("findPrevious");
		expect(resolveTerminalKey(press("Escape"), context())).toBeNull();
		expect(resolveTerminalKey(press("Enter"), context())).toBeNull();
	});

	it("binds Ctrl-D and Ctrl-L on both platforms", () => {
		expect(resolveTerminalKey(press("d", { ctrlKey: true }), context())).toBe("endOfFile");
		expect(resolveTerminalKey(press("l", { ctrlKey: true }), context({ appleKeyboard: true }))).toBe("clear");
	});

	it("scrolls on shifted paging keys", () => {
		expect(resolveTerminalKey(press("PageUp", { shiftKey: true }), context())).toBe("scrollPageUp");
		expect(resolveTerminalKey(press("End", { shiftKey: true }), context())).toBe("scrollToBottom");
		expect(resolveTerminalKey(press("PageUp"), context())).toBeNull();
	});

	it("ignores anything that is not a keydown", () => {
		expect(resolveTerminalKey(press("c", { ctrlKey: true, type: "keyup" }), context())).toBeNull();
	});
});
