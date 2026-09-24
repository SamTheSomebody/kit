/**
 * The dock's commands, and the chords they ship bound to — two separate
 * things, in two separate exports, on purpose.
 *
 * A consumer that wants a different chord passes `ports.keymap` and replaces
 * one entry; it never touches the command, and the menu row that teaches the
 * shortcut re-draws itself from whatever the table now says. A consumer that
 * wants the command from somewhere else entirely — a toolbar button, a
 * command palette, a test — reads `handle.commands` and calls `run`.
 */
import type { Keymap } from "@samthesomebody/kit/components";

/** Command ids. Namespaced, because a keymap is flat and shared. */
export const DOCK_COMMANDS = {
	toggleTabBars: "dock.toggleTabBars",
	splitRight: "dock.splitRight",
	splitDown: "dock.splitDown",
} as const;

/**
 * The kit's default binds. `mod` is ⌘ on an Apple keyboard and Ctrl
 * everywhere else, so this one line is both platforms.
 *
 * `mod+b` for "bars". On Firefox bare `Ctrl+B` opens the bookmarks sidebar;
 * the bind calls `preventDefault`, which that shortcut honours (unlike
 * `Ctrl+T`/`Ctrl+W`, which no page can take back). In a text field nothing
 * fires at all — `bindKeymap` skips typing targets — so ⌘B still means bold
 * where bold is a thing.
 *
 * `mod+right` / `mod+down` for the splits, because the chord POINTS at where
 * the pane lands — the same two edges the menu names and a drag onto that
 * edge makes. On an Apple keyboard ⌘← / ⌘→ are the browser's back and
 * forward; the bind calls `preventDefault`, which they honour, and only when
 * a pane holds focus and has a second tab to give away.
 */
export const DOCK_KEYMAP: Keymap = {
	[DOCK_COMMANDS.toggleTabBars]: "mod+b",
	[DOCK_COMMANDS.splitRight]: "mod+right",
	[DOCK_COMMANDS.splitDown]: "mod+down",
};
