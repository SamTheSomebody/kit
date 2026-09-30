/**
 * Terminal token layer — the ONE place the console's colours and metrics
 * come from (`docs/specs/2026-09-04-terminal-kit-design.md` §Token layer),
 * built the way the dock kit's is: every value is a `--tool-*` reference or
 * a `color-mix` of one, so reskinning `tools/ui/tokens.css` reskins every
 * console pane and there is no literal colour in this file.
 *
 * The palette is already a terminal palette — `tokens.css` is frozen against
 * Ghostty's Dracula — so every one of the sixteen ANSI slots is a token
 * reference and nothing else. Two of the brights wear the names the tools
 * know them by: `--tool-muted` IS bright black and `--tool-accent-hover` IS
 * bright blue.
 *
 * The six remaining brights were derived here at first, by one `color-mix`
 * toward white that reproduced Dracula's ramp almost exactly. That was
 * wrong twice over: it approximated a palette that is FROZEN and could
 * simply be read, and a `color-mix` computes to `color(srgb …)`, which
 * xterm's colour parser does not accept — those six slots silently kept
 * xterm's own defaults. They are tokens now (2026-09-04).
 *
 * xterm wants concrete colours, not expressions, so the values are resolved
 * through a probe element inside the pane: the browser is the only thing
 * that can evaluate a `var()` or a `color-mix()`, and asking it means a tool
 * that overrides a token on a subtree gets a console that matches. What the
 * browser hands back is then normalised through a canvas, because a computed
 * colour is only guaranteed to be *a* CSS colour — `color(srgb …)` is what
 * caught this — and xterm parses a much smaller set than CSS defines.
 */

import type { ISearchDecorationOptions } from "@xterm/addon-search";
import type { ITheme } from "@xterm/xterm";

/** The theme as CSS expressions — resolved by `terminalThemeOf`. */
export const TERMINAL_THEME = {
	/* `--tool-panel`, the darker of the two grounds, not the page's
	   `--tool-bg`: a console is a well in the surface, the way the dock's own
	   chrome is, and at `--tool-bg` it read as a hole in the page with no
	   edge. That forces the swap below on ANSI black. */
	background: "var(--tool-panel)",
	foreground: "var(--tool-text)",
	cursor: "var(--tool-accent)",
	cursorAccent: "var(--tool-panel)",
	selectionBackground: "var(--tool-panel-hover)",
	selectionForeground: "var(--tool-text)",
	selectionInactiveBackground: "var(--tool-border)",

	/* Dracula's palette-0 IS `--tool-panel`, which is now the background — a
	   slot equal to the ground is an invisible slot, and `\e[30m` is what a
	   few tools reach for as a "dim". So the two darkest tones swap roles:
	   the ground takes the darker, black takes `--tool-bg` and stays a shade
	   readable against it. Both palette entries survive; neither collides. */
	black: "var(--tool-bg)",
	red: "var(--tool-danger)",
	green: "var(--tool-success)",
	yellow: "var(--tool-highlight)",
	blue: "var(--tool-accent)",
	magenta: "var(--tool-pink)",
	cyan: "var(--tool-cyan)",
	white: "var(--tool-text)",

	brightBlack: "var(--tool-muted)",
	brightRed: "var(--tool-danger-bright)",
	brightGreen: "var(--tool-success-bright)",
	brightYellow: "var(--tool-highlight-bright)",
	brightBlue: "var(--tool-accent-hover)",
	brightMagenta: "var(--tool-pink-bright)",
	brightCyan: "var(--tool-cyan-bright)",
	brightWhite: "var(--tool-text-bright)",
} as const satisfies Record<string, string>;

/* Find-bar decorations. Without these the search addon does not compute a
   result COUNT at all — it only walks far enough to select the next hit — so
   the pair "highlight every match" and "say how many there are" is one
   decision, not two. */
export const TERMINAL_SEARCH = {
	matchBackground: "color-mix(in srgb, var(--tool-highlight) 30%, var(--tool-bg))",
	matchBorder: "var(--tool-border)",
	matchOverviewRuler: "var(--tool-highlight)",
	activeMatchBackground: "var(--tool-accent)",
	activeMatchBorder: "var(--tool-accent-hover)",
	activeMatchColorOverviewRuler: "var(--tool-accent)",
} as const satisfies Record<string, string>;

export type TerminalMetrics = {
	fontFamily: string;
	fontSize: number;
	lineHeight: number;
};

/* A console reads as a wall of text, so it takes the small step of the type
   scale rather than body size, and the line height a terminal wants (tight,
   but not so tight that underlined links collide with the row below). */
const FALLBACK_FONT = "ui-monospace, monospace";
const FALLBACK_FONT_SIZE = 13;
const LINE_HEIGHT = 1.25;

/** Resolve one CSS colour expression against the cascade at `probe`. */
const resolve = (probe: HTMLElement, expression: string): string => {
	probe.style.color = "";
	probe.style.color = expression;
	/* An expression the browser rejects never reaches the style object, and
	   the computed value would silently be the inherited one. */
	if (probe.style.color === "") {
		return "";
	}
	return getComputedStyle(probe).color;
};

/**
 * A computed colour, flattened to `#rrggbb`.
 *
 * `getComputedStyle` returns whatever colour space the value was written in —
 * `rgb(…)` for a hex token, but `color(srgb …)` for a `color-mix`, and CSS
 * has more of those every year. xterm accepts hex and `rgb()` and quietly
 * drops the rest, so a slot it cannot read falls back to its own default and
 * the theme is wrong in exactly the places nobody looks. A canvas is the one
 * converter every browser already ships: fill a pixel, read the bytes.
 */
const flatten = (context: CanvasRenderingContext2D, value: string): string => {
	context.clearRect(0, 0, 1, 1);
	context.fillStyle = value;
	context.fillRect(0, 0, 1, 1);
	const [red = 0, green = 0, blue = 0] = context.getImageData(0, 0, 1, 1).data;
	const hex = (channel: number) => channel.toString(16).padStart(2, "0");
	return `#${hex(red)}${hex(green)}${hex(blue)}`;
};

/** Resolve a whole record of expressions in one probe. */
const resolveAll = (element: HTMLElement, expressions: Record<string, string>): Record<string, string> => {
	const ownerDocument = element.ownerDocument;
	const probe = ownerDocument.createElement("span");
	probe.style.position = "absolute";
	probe.style.visibility = "hidden";
	probe.setAttribute("aria-hidden", "true");
	element.append(probe);
	const context = ownerDocument.createElement("canvas").getContext("2d", { willReadFrequently: true });
	const resolved: Record<string, string> = {};
	try {
		for (const [slot, expression] of Object.entries(expressions)) {
			const value = resolve(probe, expression);
			if (value === "") {
				continue;
			}
			resolved[slot] = context === null ? value : flatten(context, value);
		}
	} finally {
		probe.remove();
	}
	return resolved;
};

/** The theme, resolved to concrete colours against `element`'s cascade. */
export const terminalThemeOf = (element: HTMLElement): ITheme => resolveAll(element, TERMINAL_THEME) as ITheme;

/** The find-bar decorations, resolved the same way. */
export const terminalSearchThemeOf = (element: HTMLElement): ISearchDecorationOptions =>
	resolveAll(element, TERMINAL_SEARCH) as unknown as ISearchDecorationOptions;

/** Font stack and size, read off the same tokens the rest of the tool uses. */
export const terminalMetricsOf = (element: HTMLElement): TerminalMetrics => {
	const styles = getComputedStyle(element);
	const family = styles.getPropertyValue("--tool-font").trim();
	const size = Number.parseFloat(styles.getPropertyValue("--tool-font-size-body"));
	return {
		fontFamily: family === "" ? FALLBACK_FONT : family,
		fontSize: Number.isFinite(size) && size > 0 ? size : FALLBACK_FONT_SIZE,
		lineHeight: LINE_HEIGHT,
	};
};
