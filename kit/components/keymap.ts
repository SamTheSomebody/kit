/**
 * Keymap — commands on one side, key binds on the other, and one table
 * joining them.
 *
 * A shortcut written inline is a shortcut nobody can change: the chord, the
 * thing it does, the label that teaches it and the guard that stops it firing
 * mid-word all end up in one handler, and rebinding it means editing the
 * behaviour. So a COMMAND here knows what it does and nothing about keys, a
 * KEYMAP is `id → chord` and nothing else, and a consumer that wants a
 * different chord replaces one entry of the table.
 *
 * `play/terminal/keys.ts` already had the pure half of this idea — a
 * table resolving key events to ACTION names, applied elsewhere — and it
 * stays as it is: a VT is a sink where unbound keys must fall through to the
 * child process, and `Ctrl+C` is resolved by whether text is selected. Those
 * are not preferences to rebind. This module is for application commands.
 *
 * NOT for a control's own keyboard: arrow keys moving a listbox selection,
 * Enter committing a field, Escape closing a menu. Those are the control's
 * accessibility contract, not shortcuts — rebinding them breaks the widget
 * rather than customising it.
 */

import { isTypingTarget } from "./menu";

/**
 * A chord, written the way a person writes one: `"mod+b"`, `"shift+alt+k"`,
 * `"escape"`. Case and spacing are ignored; order is not significant.
 *
 * `mod` is the PLATFORM's command modifier — ⌘ on an Apple keyboard, Ctrl
 * everywhere else. Naming it once here is why a keymap does not have to
 * carry two spellings of every entry.
 */
export type Chord = string;

/** id → the chord(s) that run it. A list binds several to one command. */
export type Keymap = Readonly<Record<string, Chord | readonly Chord[]>>;

/**
 * What a command IS. No key anywhere in it — that is the whole point.
 *
 * `id` is namespaced by its owner (`"dock.toggleTabBars"`), because a keymap
 * is flat and two kits must be able to contribute to one without colliding.
 * `title` is what a menu row or a palette shows.
 */
export type Command = {
	id: string;
	title: string;
	run(): void;
	/** Absent means always available. */
	enabled?(): boolean;
};

type ParsedChord = {
	key: string;
	mod: boolean;
	ctrl: boolean;
	meta: boolean;
	alt: boolean;
	shift: boolean;
};

const MODIFIERS = new Set(["mod", "ctrl", "control", "meta", "cmd", "command", "alt", "option", "shift"]);

/** Written forms people use for keys whose `event.key` is spelled differently. */
const KEY_ALIASES: Readonly<Record<string, string>> = {
	esc: "escape",
	space: " ",
	spacebar: " ",
	up: "arrowup",
	down: "arrowdown",
	left: "arrowleft",
	right: "arrowright",
	plus: "+",
	del: "delete",
};

export const parseChord = (chord: Chord): ParsedChord => {
	const parsed: ParsedChord = { key: "", mod: false, ctrl: false, meta: false, alt: false, shift: false };
	/* Split on "+" but keep a literal "+" as a key: "shift++" is shift and
	   the plus key, and a naive split would leave an empty final part. */
	const parts = chord
		.toLowerCase()
		.split("+")
		.map((part) => part.trim());
	for (let at = 0; at < parts.length; at += 1) {
		const part = parts[at] === "" && at > 0 ? "+" : parts[at]!;
		if (part === "") {
			continue;
		}
		if (MODIFIERS.has(part)) {
			if (part === "mod") {
				parsed.mod = true;
			} else if (part === "ctrl" || part === "control") {
				parsed.ctrl = true;
			} else if (part === "meta" || part === "cmd" || part === "command") {
				parsed.meta = true;
			} else if (part === "alt" || part === "option") {
				parsed.alt = true;
			} else {
				parsed.shift = true;
			}
			continue;
		}
		parsed.key = KEY_ALIASES[part] ?? part;
	}
	return parsed;
};

/** The subset of a keyboard event the matcher reads — so tests need no DOM. */
export type ChordEvent = {
	readonly key: string;
	/** Physical key. Optional: a synthesised event carries none. */
	readonly code?: string;
	readonly ctrlKey: boolean;
	readonly metaKey: boolean;
	readonly altKey: boolean;
	readonly shiftKey: boolean;
};

/** True on an Apple keyboard, where `mod` is ⌘ rather than Ctrl. */
export const isApplePlatform = (): boolean => {
	if (typeof navigator === "undefined") {
		return false;
	}
	const data = (navigator as { userAgentData?: { platform?: string } }).userAgentData;
	const platform = data?.platform ?? navigator.platform ?? "";
	return /mac|iphone|ipad|ipod/i.test(platform);
};

/**
 * Does this event fire this chord?
 *
 * The key is matched on `event.key` OR on `event.code`, because neither
 * alone covers the ground. With Alt held, macOS reports the COMPOSED
 * character in `key` (`∫` for Alt+B), so only `code` says which key was
 * struck. But `code` is empty in a synthesised keydown — a CDP dispatch, an
 * agent browser pane — so a `code`-only test is a chord no automation can
 * ever fire, which is a chord no automation can check.
 */
export const matchesChord = (event: ChordEvent, chord: Chord, apple = isApplePlatform()): boolean => {
	const want = parseChord(chord);
	if (want.key === "") {
		return false;
	}
	const wantCtrl = want.ctrl || (want.mod && !apple);
	const wantMeta = want.meta || (want.mod && apple);
	if (event.ctrlKey !== wantCtrl || event.metaKey !== wantMeta) {
		return false;
	}
	if (event.altKey !== want.alt || event.shiftKey !== want.shift) {
		return false;
	}
	if (event.key.toLowerCase() === want.key) {
		return true;
	}
	const code = event.code;
	if (code === undefined || code === "") {
		return false;
	}
	if (want.key.length === 1 && want.key >= "a" && want.key <= "z") {
		return code === `Key${want.key.toUpperCase()}`;
	}
	if (want.key.length === 1 && want.key >= "0" && want.key <= "9") {
		return code === `Digit${want.key}`;
	}
	if (want.key === " ") {
		return code === "Space";
	}
	return code.toLowerCase() === want.key;
};

const chordsOf = (bound: Chord | readonly Chord[]): readonly Chord[] => (typeof bound === "string" ? [bound] : bound);

/** Which command id this event fires, if any. Pure — the whole resolution. */
export const resolveCommand = (event: ChordEvent, keymap: Keymap, apple = isApplePlatform()): string | null => {
	for (const [id, bound] of Object.entries(keymap)) {
		for (const chord of chordsOf(bound)) {
			if (matchesChord(event, chord, apple)) {
				return id;
			}
		}
	}
	return null;
};

/** Apple draws its modifiers; everywhere else spells them. */
const MODIFIER_GLYPHS: Readonly<Record<string, string>> = { mod: "⌘", ctrl: "⌃", alt: "⌥", shift: "⇧" };
const MODIFIER_WORDS: Readonly<Record<string, string>> = { mod: "Ctrl", ctrl: "Ctrl", alt: "Alt", shift: "Shift" };

/** Keys with no glyph in the face are SPELLED — `Enter`, never a U+21B5 that
 *  would fall back to the OS font (`controls/menu.css` §accelerator column). */
const KEY_LABELS: Readonly<Record<string, string>> = {
	" ": "Space",
	escape: "Esc",
	arrowup: "Up",
	arrowdown: "Down",
	arrowleft: "Left",
	arrowright: "Right",
	enter: "Enter",
	backspace: "Backspace",
	delete: "Delete",
	tab: "Tab",
};

/**
 * A chord as a LIST of keys to draw, one per cell — `["⌘", "B"]` on an
 * Apple keyboard, `["Ctrl", "B"]` elsewhere. A list, not a string, because a
 * shortcut is a sequence and the kit's accelerator column marks it up as one
 * (`kbd` per key), so chords line up down a menu instead of reading as a
 * single squashed token.
 */
export const chordKeys = (chord: Chord, apple = isApplePlatform()): string[] => {
	const parsed = parseChord(chord);
	const keys: string[] = [];
	/* Apple's own order: ⌃ ⌥ ⇧ ⌘, the command key nearest the letter. */
	if (apple) {
		if (parsed.ctrl) {
			keys.push(MODIFIER_GLYPHS.ctrl!);
		}
		if (parsed.alt) {
			keys.push(MODIFIER_GLYPHS.alt!);
		}
		if (parsed.shift) {
			keys.push(MODIFIER_GLYPHS.shift!);
		}
		if (parsed.mod || parsed.meta) {
			keys.push(MODIFIER_GLYPHS.mod!);
		}
	} else {
		if (parsed.mod || parsed.ctrl) {
			keys.push(MODIFIER_WORDS.ctrl!);
		}
		if (parsed.alt) {
			keys.push(MODIFIER_WORDS.alt!);
		}
		if (parsed.shift) {
			keys.push(MODIFIER_WORDS.shift!);
		}
		if (parsed.meta) {
			keys.push("Meta");
		}
	}
	const key = parsed.key;
	keys.push(KEY_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key.replace(/^./, (c) => c.toUpperCase())));
	return keys;
};

/** The chord a command is bound to, ready to draw; empty when unbound. */
export const commandHint = (keymap: Keymap, id: string, apple = isApplePlatform()): string[] => {
	const bound = keymap[id];
	if (bound === undefined) {
		return [];
	}
	const first = chordsOf(bound)[0];
	return first === undefined ? [] : chordKeys(first, apple);
};

export type BindKeymapOptions = {
	/** Where to listen. A dock in an iframe passes its OWN document. */
	target: EventTarget;
	commands: readonly Command[];
	keymap: Keymap;
	/**
	 * Last word on whether this target should answer at all — a second dock
	 * on one page uses it so both do not fire on one chord.
	 */
	accepts?(event: KeyboardEvent): boolean;
	/**
	 * Let auto-repeat fire the command over and over. Off by default: a
	 * command is a discrete act, and a leant-on key running one twenty times
	 * is a bug every time somebody rests a finger — curate's merge queue
	 * would blast through a dozen pairs on one held `d`. Turn it on for a
	 * command where repeating IS the point, like stepping to the next record.
	 */
	repeat?: boolean;
	apple?: boolean;
};

/**
 * Wire a keymap to a target. Returns the unbind.
 *
 * Never fires while a caret is in a field — `isTypingTarget` is the control
 * kit's one spelling of that, and a chord that fires mid-word eats someone's
 * keystroke. A matched command calls `preventDefault`, which is what stops
 * the browser's own `Ctrl+B` (Firefox's bookmarks sidebar) coming with it.
 */
export const bindKeymap = (options: BindKeymapOptions): (() => void) => {
	const apple = options.apple ?? isApplePlatform();
	const byId = new Map(options.commands.map((command) => [command.id, command]));
	const onKeyDown = (event: Event): void => {
		const keyEvent = event as KeyboardEvent;
		if (keyEvent.repeat && options.repeat !== true) {
			return;
		}
		/* Duck-typed, not `instanceof Element`: `Element` is not a global
		   outside a browser, and referencing it throws rather than returning
		   false. `closest` is the precondition `isTypingTarget` actually
		   needs, so asking for it is both safer and more honest. */
		const target = keyEvent.target as Element | null;
		if (target && typeof target.closest === "function") {
			if (isTypingTarget(target)) {
				return;
			}
			/* A <select> is not a typing target — `shouldOpenPaneMenu` says so
			   deliberately, because a right-click on one should still reach the
			   pane menu. A SHORTCUT is the opposite case: letters move the
			   focused select's options, so firing a command from one steals a
			   keystroke that already meant something. Same element, two
			   questions, two answers. */
			if (target.closest("select") !== null) {
				return;
			}
		}
		if (options.accepts && !options.accepts(keyEvent)) {
			return;
		}
		const id = resolveCommand(keyEvent, options.keymap, apple);
		if (id === null) {
			return;
		}
		const command = byId.get(id);
		if (!command || command.enabled?.() === false) {
			return;
		}
		keyEvent.preventDefault();
		command.run();
	};
	options.target.addEventListener("keydown", onKeyDown);
	return () => options.target.removeEventListener("keydown", onKeyDown);
};
