/**
 * Link detection — pure string → spans, so the whole of "what is clickable"
 * is testable without a terminal, a DOM or a repo
 * (`docs/specs/2026-09-04-terminal-kit-design.md` §Links).
 *
 * Two kinds and one rule between them: URLs win, and any path that lands
 * inside a URL's span is dropped, so the `/lobby/index.html` inside
 * `http://127.0.0.1:5173/lobby/index.html` never becomes a second, wrong
 * link over the top of the first.
 *
 * A path must contain a slash. Without that rule the matcher lights up every
 * bare word with a dot in it — `vite.config`, `v1.2.3`, an English sentence
 * ending in `.ts` — and a console where half the prose is underlined teaches
 * the reader to stop trusting the underline.
 */

import type { TerminalLinkTarget } from "./types.ts";

export type TerminalLinkMatch = {
	/** Index into the line, half-open `[start, end)`. */
	start: number;
	end: number;
	text: string;
	target: TerminalLinkTarget;
};

const URL_PATTERN = /\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"'`]+/gi;

/* One path segment. `~` and `@` are in because `~/dev/x.ts` and
   `@games/foo/vite.config.ts` both show up in this repo's output. */
const SEGMENT = String.raw`[\w.@~+-]+`;

/* `tools/lobby/vite.config.ts:127:5`, `./serve.go:88:2`, `/abs/path.ts`,
   and tsc's `play/dock/view.ts(120,7)`. The extension is required for
   the same reason the slash is: a directory is rarely what someone wants to
   click, and dropping it costs the matcher every false positive that ends
   in a word. */
const PATH_PATTERN = new RegExp(
	String.raw`(?:\.{1,2})?\/?(?:${SEGMENT}\/)+${SEGMENT}\.[A-Za-z][\w-]{0,9}` +
		String.raw`(?::(\d+)(?::(\d+))?|\((\d+),\s*(\d+)\))?`,
	"g",
);

/* Output wraps a path in prose as often as not: `(at /x/y.ts)`, `"a/b.ts",`,
   `a/b.ts.` — trailing punctuation belongs to the sentence, never the path.
   A closing bracket is only trimmed when the match holds no opener, so
   tsc's `view.ts(120,7)` keeps its own. */
const trimTrailing = (text: string): string => {
	let end = text.length;
	while (end > 0) {
		const character = text[end - 1]!;
		if (character === ")" && text.slice(0, end).includes("(")) {
			break;
		}
		if (!".,:;!?'\"`)]}>".includes(character)) {
			break;
		}
		end -= 1;
	}
	return text.slice(0, end);
};

const numberOrUndefined = (value: string | undefined): number | undefined =>
	value === undefined ? undefined : Number(value);

const overlaps = (start: number, end: number, spans: readonly [number, number][]): boolean =>
	spans.some(([from, to]) => start < to && from < end);

/** Every link in one line of terminal text, in reading order. */
export const matchTerminalLinks = (line: string): TerminalLinkMatch[] => {
	const matches: TerminalLinkMatch[] = [];
	const urlSpans: [number, number][] = [];

	for (const match of line.matchAll(URL_PATTERN)) {
		const start = match.index;
		const text = trimTrailing(match[0]);
		if (text.length === 0) {
			continue;
		}
		urlSpans.push([start, start + text.length]);
		matches.push({ start, end: start + text.length, text, target: { kind: "url", url: text } });
	}

	for (const match of line.matchAll(PATH_PATTERN)) {
		const start = match.index;
		const text = trimTrailing(match[0]);
		if (text.length === 0) {
			continue;
		}
		if (overlaps(start, start + text.length, urlSpans)) {
			continue;
		}
		const line1 = numberOrUndefined(match[1] ?? match[3]);
		const column = numberOrUndefined(match[2] ?? match[4]);
		/* The captures come off the UNTRIMMED match, so a trimmed tail that
		   ate the position suffix must not leave a phantom line number. */
		const kept = text.length === match[0].length;
		const path = text.replace(/(?::\d+(?::\d+)?|\(\d+,\s*\d+\))$/, "");
		matches.push({
			start,
			end: start + text.length,
			text,
			target: {
				kind: "path",
				path,
				...(kept && line1 !== undefined ? { line: line1 } : {}),
				...(kept && column !== undefined ? { column } : {}),
			},
		});
	}

	return matches.sort((left, right) => left.start - right.start);
};

/** Default hover text; a consumer overrides it through `TerminalLinksPort`. */
export const describeTerminalLink = (target: TerminalLinkTarget): string =>
	target.kind === "url"
		? `open ${target.url}`
		: `open ${target.path}${target.line === undefined ? "" : `:${target.line}`}`;
