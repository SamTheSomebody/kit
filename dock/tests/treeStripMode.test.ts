import { describe, expect, it } from "vitest";

import { DOCK_THEME } from "../theme";
import { createDockCore, isBareLeaf, parseLayout, stripModeOf, type DockCore } from "../tree";
import type { DockLeaf, DockMark, DockSplit } from "../types";

const makeCore = (): { core: DockCore; marks: DockMark[] } => {
	const marks: DockMark[] = [];
	const core = createDockCore({ mark: (kind) => marks.push(kind), notify: () => {} }, DOCK_THEME.zFloatBase);
	return { core, marks };
};

/** The docked root as a split — read through a call so a test's own
 *  assignment of a leaf to the root does not narrow it. */
const rootSplit = (core: DockCore): DockSplit => core.state.layout as DockSplit;

/** Two single-tab panes side by side — the shape focus mode bares. */
const twoPanes = (core: DockCore): { left: DockLeaf; right: DockLeaf } => {
	const left = core.newLeaf(["game"]);
	const right = core.newLeaf(["timeline"]);
	core.state.layout = left;
	core.splitLeaf(left, "r", right);
	return { left, right };
};

describe("isBareLeaf with a per-pane strip mode", () => {
	it("`always` keeps the strip on the root solo pane", () => {
		const { core } = makeCore();
		const only = core.newLeaf(["game"]);
		core.state.layout = only;
		core.setStripMode(only, "always");
		expect(isBareLeaf(core.state, only, false)).toBe(false);
	});

	it("`always` wins over focus mode", () => {
		const { core } = makeCore();
		const { left, right } = twoPanes(core);
		core.state.hideSingleTabBars = true;
		core.setStripMode(left, "always");
		expect(isBareLeaf(core.state, left, false)).toBe(false);
		expect(isBareLeaf(core.state, right, false)).toBe(true);
	});

	it("`never` hides the strip with focus mode off, several tabs, collapsed, or in a float", () => {
		const { core } = makeCore();
		const left = core.newLeaf(["game", "assets"]);
		core.state.layout = left;
		core.splitLeaf(left, "r", core.newLeaf(["timeline"]));
		core.setStripMode(left, "never");
		expect(isBareLeaf(core.state, left, false)).toBe(true);
		core.collapseGuarded(left);
		expect(isBareLeaf(core.state, left, false)).toBe(true);
		expect(isBareLeaf(core.state, left, true)).toBe(true);
	});

	it("`auto` is today's rule", () => {
		const { core } = makeCore();
		const { left } = twoPanes(core);
		core.setStripMode(left, "never");
		core.setStripMode(left, "auto");
		expect(isBareLeaf(core.state, left, false)).toBe(false);
		core.state.hideSingleTabBars = true;
		expect(isBareLeaf(core.state, left, false)).toBe(true);
	});
});

describe("setStripMode", () => {
	it("stores `auto` as absence and reports whether anything changed", () => {
		const { core, marks } = makeCore();
		const { left } = twoPanes(core);
		expect(core.setStripMode(left, "auto")).toBe(false);
		expect(core.setStripMode(left, "never")).toBe(true);
		expect(left.strip).toBe("never");
		expect(core.setStripMode(left, "never")).toBe(false);
		expect(core.setStripMode(left, "auto")).toBe(true);
		expect("strip" in left).toBe(false);
		expect(stripModeOf(left)).toBe("auto");
		expect(marks.filter((mark) => mark === "bars")).toHaveLength(2);
	});

	it("round-trips through serialize / hydrate, and leaves auto layouts byte-identical", () => {
		const { core } = makeCore();
		const { left, right } = twoPanes(core);
		const before = core.serialize();
		expect(before).not.toContain("strip");
		core.setStripMode(left, "never");
		core.setStripMode(right, "always");
		const other = makeCore().core;
		expect(other.hydrate(core.serialize())).toBe(true);
		expect(other.findLeaf(left.id)?.strip).toBe("never");
		expect(other.findLeaf(right.id)?.strip).toBe("always");
		expect(other.serialize()).toBe(core.serialize());
	});
});

describe("a pane keeps its strip mode when it moves", () => {
	it("as a pane drag onto another pane's edge", () => {
		const { core } = makeCore();
		const { left, right } = twoPanes(core);
		core.setStripMode(left, "never");
		expect(core.dropOnBody(right, "b", { kind: "pane", source: left.id })).toBe(true);
		const moved = rootSplit(core).b as DockLeaf;
		expect(moved.tabs).toEqual(["game"]);
		expect(moved.strip).toBe("never");
	});

	it("as a pane floated", () => {
		const { core } = makeCore();
		const { left } = twoPanes(core);
		core.setStripMode(left, "always");
		core.dropAsFloat(0, 0, 100, 100, { kind: "pane", source: left.id });
		expect((core.state.floating[0]?.root as DockLeaf).strip).toBe("always");
	});

	it("but not as a tab — a tab joins or opens a pane with that pane's own mode", () => {
		const { core } = makeCore();
		const left = core.newLeaf(["game", "assets"]);
		core.state.layout = left;
		core.setStripMode(left, "never");
		core.dropOnBody(left, "r", { kind: "tab", tab: "assets", source: left.id });
		expect((rootSplit(core).b as DockLeaf).strip).toBeUndefined();
	});
});

describe("parseLayout and the strip field", () => {
	const withStrip = (strip: unknown): string =>
		JSON.stringify({ v: 1, layout: { leaf: true, id: "L1", tabs: ["a"], active: "a", strip }, floating: [] });

	it("keeps `always` and `never`", () => {
		expect((parseLayout(withStrip("always"))?.layout as DockLeaf).strip).toBe("always");
		expect((parseLayout(withStrip("never"))?.layout as DockLeaf).strip).toBe("never");
	});

	it("repairs `auto` and anything unknown to absence rather than refusing the layout", () => {
		for (const strip of ["auto", "hidden", true, 3, null]) {
			const parsed = parseLayout(withStrip(strip));
			expect(parsed).toBeDefined();
			expect("strip" in (parsed?.layout as DockLeaf)).toBe(false);
		}
	});

	it("validates leaves inside floats too", () => {
		const parsed = parseLayout(
			JSON.stringify({
				v: 1,
				layout: null,
				floating: [{ id: "F1", x: 0, y: 0, w: 10, h: 10, z: 1, root: { leaf: true, id: "L1", tabs: ["a"], strip: "nope" } }],
			}),
		);
		expect("strip" in (parsed?.floating[0]?.root as DockLeaf)).toBe(false);
	});
});
