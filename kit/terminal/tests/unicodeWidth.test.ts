import { Unicode11Addon } from "@xterm/addon-unicode11";
import { Terminal } from "@xterm/xterm";
import { describe, expect, it } from "vitest";

/**
 * House tool glyphs (pnpm / vite / oxlint) vs emoji a child process may
 * print. Unicode 11 only changes the second set — that is why the addon
 * stays: the pane is a sink, not a house-glyph printer.
 */
const TOOL_OUTPUT = ["✓", "✗", "➜", "⚠", "█", "▸", "→", "…", "✔", "中"] as const;
const CHILD_EMOJI = ["✅", "😀"] as const;

type UnicodeService = { wcwidth?(code: number): number; getStringCellWidth?(value: string): number };

const widthOf = (terminal: Terminal, text: string): number => {
	const service = (terminal as unknown as { _core: { unicodeService: UnicodeService } })._core.unicodeService;
	if (typeof service.getStringCellWidth === "function") {
		return service.getStringCellWidth(text);
	}
	if (typeof service.wcwidth === "function") {
		let sum = 0;
		for (const glyph of text) {
			sum += service.wcwidth!(glyph.codePointAt(0) ?? 0);
		}
		return sum;
	}
	throw new Error("unicodeService has no width API");
};

const pair = (): { baseline: Terminal; upgraded: Terminal } => {
	const baseline = new Terminal({ allowProposedApi: true });
	const upgraded = new Terminal({ allowProposedApi: true });
	upgraded.loadAddon(new Unicode11Addon());
	upgraded.unicode.activeVersion = "11";
	return { baseline, upgraded };
};

const changed = (glyphs: readonly string[]): string[] => {
	const { baseline, upgraded } = pair();
	return glyphs.filter((glyph) => widthOf(baseline, glyph) !== widthOf(upgraded, glyph));
};

describe("unicode11 vs default widths", () => {
	it("house tool glyphs are the same width under Unicode 6 and 11", () => {
		expect(changed(TOOL_OUTPUT)).toEqual([]);
	});

	it("child emoji change width — why the addon stays", () => {
		expect(changed(CHILD_EMOJI)).toEqual([...CHILD_EMOJI]);
	});
});
