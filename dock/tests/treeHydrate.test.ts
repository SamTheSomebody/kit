import { describe, expect, it } from "vitest";

import { usableLayout } from "../dockLayout.ts";
import { DOCK_THEME } from "../theme";
import { createDockCore, parseLayout, type DockCore } from "../tree";
import type { DockLeaf, DockSplit } from "../types";

const makeCore = (): DockCore => createDockCore({ mark: () => {}, notify: () => {} }, DOCK_THEME.zFloatBase);

const leaf = (id: string, tabs: unknown[], active: unknown = tabs[0]): Record<string, unknown> => ({
	leaf: true,
	id,
	tabs,
	active,
});
const layoutOf = (layout: unknown, floating: unknown = []): string => JSON.stringify({ v: 1, layout, floating });

describe("parseLayout", () => {
	it("refuses what is not a layout", () => {
		expect(parseLayout("not json")).toBeUndefined();
		expect(parseLayout("null")).toBeUndefined();
		expect(parseLayout("[]")).toBeUndefined();
		expect(parseLayout(layoutOf({ split: "row", a: null, b: leaf("L1", ["a"]) }))).toBeUndefined();
		expect(parseLayout(layoutOf(leaf("L1", "a")))).toBeUndefined();
		expect(parseLayout(layoutOf(null, [{ id: "F1", x: 0, y: 0, w: 10, h: 10, root: leaf("L1", ["a"]) }]))).toBeUndefined();
		expect(parseLayout(layoutOf(null, "nope"))).toBeUndefined();
	});

	it("refuses two leaves with one id", () => {
		expect(
			parseLayout(layoutOf({ split: "row", ratio: 0.5, a: leaf("L1", ["a"]), b: leaf("L1", ["b"]) })),
		).toBeUndefined();
	});

	it("repairs what has one safe reading", () => {
		const parsed = parseLayout(
			JSON.stringify({
				layout: {
					split: "column",
					ratio: 7,
					a: leaf("L1", ["a", "a", 3, "b"], "gone"),
					b: leaf("L2", ["b", "c"]),
				},
			}),
		);
		expect(parsed).toBeDefined();
		const split = parsed?.layout as DockSplit;
		expect(split.split).toBe("col");
		expect(split.ratio).toBe(0.5);
		expect((split.a as DockLeaf).tabs).toEqual(["a", "b"]);
		expect((split.a as DockLeaf).active).toBe("a");
		expect((split.b as DockLeaf).tabs).toEqual(["c"]);
		expect(parsed?.floating).toEqual([]);
		expect(parsed?.v).toBe(1);
	});

	it("keeps a pane that arrived empty", () => {
		const parsed = parseLayout(layoutOf(leaf("L1", [], null)));
		expect((parsed?.layout as DockLeaf).tabs).toEqual([]);
		expect((parsed?.layout as DockLeaf).active).toBeNull();
	});
});

describe("hydrate", () => {
	it("leaves the current layout alone when the json is unreadable", () => {
		const core = makeCore();
		core.state.layout = core.newLeaf(["a"]);
		const before = core.serialize();
		expect(core.hydrate('{"v":1,"layout":{"leaf":true}}')).toBe(false);
		expect(core.hydrate("{")).toBe(false);
		expect(core.serialize()).toBe(before);
	});

	it("does not throw on a layout with no floating list", () => {
		const core = makeCore();
		expect(core.hydrate(JSON.stringify({ v: 1, layout: leaf("L4", ["a"]) }))).toBe(true);
		expect(core.state.floating).toEqual([]);
		expect(core.newLeaf(["b"]).id).toBe("L5");
	});

	it("restacks float z saved far above the base", () => {
		const core = makeCore();
		const base = DOCK_THEME.zFloatBase;
		core.hydrate(
			layoutOf(null, [
				{ id: "F1", x: 0, y: 0, w: 10, h: 10, z: 900, root: leaf("L1", ["a"]) },
				{ id: "F2", x: 0, y: 0, w: 10, h: 10, z: 400, root: leaf("L2", ["b"]) },
			]),
		);
		expect(core.state.floating.map((float) => [float.id, float.z])).toEqual([
			["F1", base + 2],
			["F2", base + 1],
		]);
		expect(core.topZ()).toBe(base + 2);
	});
});

describe("float z", () => {
	it("stays under the preview and the menu however often floats are raised", () => {
		const core = makeCore();
		core.floatAt(core.newLeaf(["a"]), 0, 0, 10, 10);
		core.floatAt(core.newLeaf(["b"]), 0, 0, 10, 10);
		const [first, second] = core.state.floating;
		if (!first || !second) throw new Error("two floats expected");
		for (let raise = 0; raise < 200; raise++) {
			core.raiseFloat(raise % 2 === 0 ? first : second);
		}
		const highest = Math.max(...core.state.floating.map((float) => float.z));
		expect(highest).toBe(DOCK_THEME.zFloatBase + 2);
		expect(highest).toBeLessThan(DOCK_THEME.zPreview);
		expect(core.raiseFloat(second)).toBe(false);
	});
});

describe("usableLayout", () => {
	it("uses the dock's own check, not a sniff for a leaf", () => {
		expect(usableLayout(layoutOf({ split: "row", a: leaf("L1", ["a"]), b: { leaf: false } }))).toBeUndefined();
		expect(usableLayout(layoutOf(leaf("L1", ["a"]), "nope"))).toBeUndefined();
		const floatOnly = layoutOf(null, [{ id: "F1", x: 0, y: 0, w: 10, h: 10, z: 21, root: leaf("L1", ["a"]) }]);
		expect(usableLayout(floatOnly)).toBe(floatOnly);
	});
});
