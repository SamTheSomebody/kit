import { describe, expect, it } from "vitest";

import { matchTerminalLinks } from "../links.ts";

describe("matchTerminalLinks", () => {
	it("finds a repo-relative path with line and column", () => {
		const [link] = matchTerminalLinks("  tools/lobby/vite.config.ts:127:5  fixed");
		expect(link?.target).toEqual({ kind: "path", path: "tools/lobby/vite.config.ts", line: 127, column: 5 });
		expect(link?.text).toBe("tools/lobby/vite.config.ts:127:5");
	});

	it("reads tsc's parenthesised position", () => {
		const [link] = matchTerminalLinks("play/dock/view.ts(120,7): error TS2322: nope");
		expect(link?.target).toEqual({ kind: "path", path: "play/dock/view.ts", line: 120, column: 7 });
	});

	it("keeps a dotted prefix and a trailing Go colon out of the path", () => {
		const [link] = matchTerminalLinks("./tools/rebuild/01-capture/serve.go:88:2: undefined: foo");
		expect(link?.target).toEqual({ kind: "path", path: "./tools/rebuild/01-capture/serve.go", line: 88, column: 2 });
	});

	it("takes an absolute path out of a stack frame", () => {
		const [link] = matchTerminalLinks("    at run (/Users/sam/game-mono/tools/verify/verify.ts:12:9)");
		expect(link?.target).toEqual({
			kind: "path",
			path: "/Users/sam/game-mono/tools/verify/verify.ts",
			line: 12,
			column: 9,
		});
	});

	it("drops sentence punctuation but keeps tsc's own bracket", () => {
		expect(matchTerminalLinks('see "play/terminal/pane.ts".')[0]?.text).toBe("play/terminal/pane.ts");
		expect(matchTerminalLinks("play/terminal/pane.ts(3,1)")[0]?.text).toBe("play/terminal/pane.ts(3,1)");
	});

	it("finds a URL and does not also find a path inside it", () => {
		const links = matchTerminalLinks("  ➜  Local:   http://127.0.0.1:5173/lobby/index.html");
		expect(links).toHaveLength(1);
		expect(links[0]?.target).toEqual({ kind: "url", url: "http://127.0.0.1:5173/lobby/index.html" });
	});

	it("ignores words that only look like paths", () => {
		expect(matchTerminalLinks("built in 1.24s and/or later")).toEqual([]);
		expect(matchTerminalLinks("vite v6.0.7 ready")).toEqual([]);
	});

	it("returns matches in reading order", () => {
		const links = matchTerminalLinks("a/one.ts:1 then http://x.test/y then b/two.ts");
		expect(links.map((link) => link.text)).toEqual(["a/one.ts:1", "http://x.test/y", "b/two.ts"]);
	});

	it("reports spans that slice back to the matched text", () => {
		const line = "FAIL tools/lobby/appendLog.test.ts > appendLog";
		const [link] = matchTerminalLinks(line);
		expect(line.slice(link!.start, link!.end)).toBe(link!.text);
	});
});
