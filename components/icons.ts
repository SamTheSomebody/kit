/* The kit's icon set — glyph-first, drawn-second.
 *
 * A glyph is used wherever the vendored face has one, because a character
 * inherits colour, size and baseline for free and never drifts from the type
 * around it. Everything else is drawn on a 12×12 grid.
 *
 * GLYPHS ARE CHECKED AGAINST THE FACE'S cmap, mechanically. `↻` (U+21BB),
 * `↵` (U+21B5) and `⚲` (U+26B2) all looked right during the design and are
 * absent from JetBrains Mono — macOS was quietly substituting another face,
 * and on a machine without it they would have been tofu. `tests/cmap.test.ts`
 * reads `../../fonts/JetBrainsMono-Regular.woff2` and fails on any glyph the
 * face does not carry, so the mistake cannot be made twice.
 */

export type IconName =
	| "add"
	| "anchor"
	| "clear"
	| "click"
	| "close"
	| "collapse"
	| "confirm"
	| "copy"
	| "delete"
	| "download"
	| "drag"
	| "expand"
	| "external"
	| "filter"
	| "fullscreen"
	| "generate"
	| "help"
	| "link"
	| "lock"
	| "menu"
	| "middleClick"
	| "more"
	| "move"
	| "next"
	| "pause"
	| "pin"
	| "play"
	| "previous"
	| "rebuild"
	| "remove"
	| "restart"
	| "rightClick"
	| "rotate"
	| "scale"
	| "search"
	| "settings"
	| "star"
	| "step"
	| "status"
	| "visible";

/* The fourteen the face draws for us. */
export const GLYPHS: Partial<Record<IconName, string>> = {
	close: "×",
	confirm: "✓",
	collapse: "▾",
	expand: "▾",
	previous: "‹",
	next: "›",
	more: "⋮",
	menu: "≡",
	add: "⊕",
	remove: "⊖",
	external: "↗",
	clear: "⌫",
	help: "?",
	status: "●",
};

/* The drawn ones. A toggle names both of its forms; `on` is the latched
   state, which is the only place in the kit an icon is filled. */
export const SPRITES: Partial<Record<IconName, { off: string; on?: string }>> = {
	rebuild: { off: "i-refresh" },
	generate: { off: "i-generate" },
	search: { off: "i-search" },
	download: { off: "i-download" },
	copy: { off: "i-copy" },
	delete: { off: "i-trash" },
	filter: { off: "i-filter" },
	settings: { off: "i-sliders" },
	drag: { off: "i-grip" },
	click: { off: "i-mouse-left" },
	rightClick: { off: "i-mouse-right" },
	middleClick: { off: "i-mouse-middle" },
	pin: { off: "i-pin", on: "i-pin-on" },
	lock: { off: "i-lock-open", on: "i-lock-closed" },
	visible: { off: "i-eye-off", on: "i-eye" },
	star: { off: "i-star", on: "i-star-on" },
	link: { off: "i-link", on: "i-link-off" },
	fullscreen: { off: "i-expand", on: "i-restore" },
	/* The editor bar's transforms and transport. `pause` is the toggle: its
	   latched form is PLAY, because the key is latched while time is frozen
	   and what it offers then is to let it run. `play` is named as well, for
	   a host that draws the two as separate keys. */
	move: { off: "i-move" },
	rotate: { off: "i-rotate" },
	scale: { off: "i-scale" },
	anchor: { off: "i-anchor" },
	play: { off: "i-play" },
	pause: { off: "i-pause", on: "i-play" },
	step: { off: "i-step" },
	restart: { off: "i-refresh" },
};

/* An icon that means two things. `Icon` renders both forms and CSS picks by
   `aria-pressed`, so the truth stays in the attribute a screen reader reads
   rather than in a class the markup has to keep in step. */
export const isToggle = (name: IconName): boolean => SPRITES[name]?.on !== undefined;

/* The three gestures are drawn on an 8×12 viewBox rather than 12×12: a hint
   column is monospaced, so a gesture has to fill exactly ONE cell. At 12×12
   it took two cells with slack inside them, which is why `⇧`+click and `⌘W`
   used to space differently down the same menu. */
export const GESTURES: ReadonlySet<IconName> = new Set<IconName>(["click", "rightClick", "middleClick"]);

/* Every glyph the kit ships, for the cmap gate to walk. */
export const glyphCharacters = (): string[] => Object.values(GLYPHS).filter((g): g is string => Boolean(g));
