import { describe, expect, it } from "vitest";

import { DOCK_THEME } from "../theme";
import { createDockCore, type DockCore } from "../tree";
import type { DockLeaf, DockMark, DockNode, DockSplit } from "../types";

const makeCore = (): { core: DockCore; marks: DockMark[]; notices: string[] } => {
	const marks: DockMark[] = [];
	const notices: string[] = [];
	const core = createDockCore(
		{ mark: (kind) => marks.push(kind), notify: (text) => notices.push(text) },
		DOCK_THEME.zFloatBase,
	);
	return { core, marks, notices };
};

/** Reads the docked root as a split without stale control-flow narrowing. */
const rootOf = (core: DockCore): DockSplit => core.state.layout as DockSplit;

/** row( left[a,b] , right[c] ) */
const twoPanes = (core: DockCore): { left: DockLeaf; right: DockLeaf } => {
	const left = core.newLeaf(["a", "b"]);
	const right = core.newLeaf(["c"]);
	core.state.layout = left;
	core.splitLeaf(left, "r", right);
	return { left, right };
};

describe("tab payloads", () => {
	it("a tab dropped on another strip joins at the index and lands expanded", () => {
		const { core, marks } = makeCore();
		const { left, right } = twoPanes(core);
		right.collapsed = 7;
		expect(core.dropOnStrip(right, 0, { kind: "tab", tab: "a", source: left.id })).toBe(true);
		expect(right.tabs).toEqual(["a", "c"]);
		expect(right.active).toBe("a");
		expect(right.collapsed).toBe(false);
		expect(left.tabs).toEqual(["b"]);
		expect(marks).toEqual(["join"]);
	});

	it("a tab dropped on its own strip reorders in place", () => {
		const { core, marks, notices } = makeCore();
		const { left } = twoPanes(core);
		expect(core.dropOnStrip(left, 2, { kind: "tab", tab: "a", source: left.id })).toBe(true);
		expect(left.tabs).toEqual(["b", "a"]);
		expect(left.active).toBe("a");
		expect(marks).toEqual(["reorder"]);
		expect(notices).toEqual(["tab reordered"]);
	});

	it("the last tab out removes the pane and the sibling absorbs", () => {
		const { core } = makeCore();
		const { left, right } = twoPanes(core);
		core.dropOnStrip(left, 0, { kind: "tab", tab: "c", source: right.id });
		expect(core.state.layout).toBe(left);
		expect(left.tabs).toEqual(["c", "a", "b"]);
	});

	it("a tab from a float lands with a redock mark", () => {
		const { core, marks } = makeCore();
		const { left } = twoPanes(core);
		const floated = core.newLeaf(["f"]);
		core.floatAt(floated, 0, 0, 340, 240);
		core.dropOnStrip(left, 0, { kind: "tab", tab: "f", source: floated.id });
		expect(core.state.floating).toEqual([]); /* emptied window closed */
		expect(marks).toEqual(["join", "redock"]);
	});
});

describe("pane payloads", () => {
	it("a pane dropped on a strip merges all tabs, order and active kept", () => {
		const { core, notices } = makeCore();
		const { left, right } = twoPanes(core);
		left.active = "b";
		expect(core.dropOnStrip(right, 1, { kind: "pane", source: left.id })).toBe(true);
		expect(right.tabs).toEqual(["c", "a", "b"]);
		expect(right.active).toBe("b");
		expect(core.state.layout).toBe(right); /* sibling absorbed */
		expect(notices).toEqual(["pane merged"]);
	});

	it("a pane dropped on its own strip or edge is a no-op", () => {
		const { core, marks } = makeCore();
		const { left } = twoPanes(core);
		expect(core.dropOnStrip(left, 0, { kind: "pane", source: left.id })).toBe(false);
		expect(core.dropOnBody(left, "l", { kind: "pane", source: left.id })).toBe(false);
		expect(left.tabs).toEqual(["a", "b"]);
		expect(marks).toEqual([]);
	});
});

describe("five-zone body drops", () => {
	it("edge zones split at ratio .5; the centre joins as a tab", () => {
		const { core } = makeCore();
		const { left, right } = twoPanes(core);
		expect(core.dropOnBody(right, "t", { kind: "tab", tab: "a", source: left.id })).toBe(true);
		const outer = core.state.layout as DockSplit;
		const inner = outer.b as DockSplit;
		expect(inner.split).toBe("col");
		expect((inner.a as DockLeaf).tabs).toEqual(["a"]);
		expect(inner.b).toBe(right);

		expect(core.dropOnBody(right, "c", { kind: "tab", tab: "b", source: left.id })).toBe(true);
		expect(right.tabs).toEqual(["c", "b"]);
		expect(core.state.layout).toBe(inner); /* left emptied, sibling absorbed */
	});

	it("a sole tab dragged to its own pane's edge is a no-op", () => {
		const { core } = makeCore();
		const { right } = twoPanes(core);
		expect(core.dropOnBody(right, "l", { kind: "tab", tab: "c", source: right.id })).toBe(false);
	});

	it("a tree dragged onto one of its own leaves is a no-op", () => {
		const { core } = makeCore();
		const { left } = twoPanes(core);
		expect(core.dropOnBody(left, "l", { kind: "tree", node: core.state.layout! })).toBe(false);
	});
});

describe("tree payloads — splice/flatten duality", () => {
	/** row( target[t] , row( one[a] collapsed@1 , two[b, c] collapsed@2 ) ) */
	const withSubtree = (core: DockCore): { target: DockLeaf; subtree: DockSplit; one: DockLeaf; two: DockLeaf } => {
		const target = core.newLeaf(["t"]);
		const one = core.newLeaf(["a"]);
		const two = core.newLeaf(["b", "c"], "c");
		core.state.layout = target;
		core.splitLeaf(target, "r", one);
		core.splitLeaf(one, "r", two);
		one.collapsed = 1;
		two.collapsed = 2;
		const subtree = rootOf(core).b as DockSplit;
		return { target, subtree, one, two };
	};

	it("splices in WHOLE on structural targets — internal splits survive, expanded", () => {
		const { core } = makeCore();
		const { target, subtree, one, two } = withSubtree(core);
		expect(core.dropOnBody(target, "l", { kind: "tree", node: subtree })).toBe(true);
		const outer = core.state.layout as DockSplit;
		expect(outer.a).toBe(subtree); /* spliced whole, left of target */
		expect(outer.b).toBe(target);
		expect(subtree.a).toBe(one);
		expect(subtree.b).toBe(two);
		expect(one.collapsed).toBe(false); /* a drop always lands expanded */
		expect(two.collapsed).toBe(false);
	});

	it("flattens to tabs in tree order on joins; active = most recently collapsed leaf's", () => {
		const { core } = makeCore();
		const { target, subtree } = withSubtree(core);
		expect(core.dropOnStrip(target, 1, { kind: "tree", node: subtree })).toBe(true);
		expect(target.tabs).toEqual(["t", "a", "b", "c"]);
		expect(target.active).toBe("c"); /* leaf `two` collapsed last; its active */
		expect(core.state.layout).toBe(target);
	});

	it("a tree floats WHOLE under ⇧", () => {
		const { core, marks } = makeCore();
		const { subtree } = withSubtree(core);
		expect(core.dropAsFloat(10, 20, 340, 240, { kind: "tree", node: subtree })).toBe(true);
		expect(core.state.floating[0]!.root).toBe(subtree);
		expect(marks).not.toContain("float"); /* the float mark is tab-only */
	});
});

describe("group bar drops", () => {
	const collapsedGroup = (core: DockCore): { open: DockLeaf; subtree: DockSplit; one: DockLeaf; two: DockLeaf } => {
		const open = core.newLeaf(["open"]);
		const one = core.newLeaf(["a"]);
		const two = core.newLeaf(["b"]);
		core.state.layout = open;
		core.splitLeaf(open, "b", one);
		core.splitLeaf(one, "r", two);
		one.collapsed = 1;
		two.collapsed = 2;
		const subtree = rootOf(core).b as DockSplit;
		return { open, subtree, one, two };
	};

	it("the bar's empty area always makes a NEW pane beside the group, expanded", () => {
		const { core, notices } = makeCore();
		const { open, subtree } = collapsedGroup(core);
		expect(core.dropOnGroupBar(subtree, { kind: "tab", tab: "open", source: open.id })).toBe(true);
		/* the sole tab left `open`, so that pane died and the new split sits
		   at the root: the group, and the landed pane after it on the bar */
		const holder = rootOf(core);
		expect(holder.split).toBe("row");
		expect(holder.a).toBe(subtree);
		expect((holder.b as DockLeaf).tabs).toEqual(["open"]);
		expect((holder.b as DockLeaf).collapsed).toBeFalsy();
		expect(notices).toContain("new split");
	});

	/* The bar flattens row-nesting into one title cell per leaf, so a payload
	   that lands on the bar MUST land on the bar's own axis: collapse it and
	   it becomes another cell in the same bar, which is only honest if it is
	   really a side-by-side pane. A `col` here would have drawn "a | b | open"
	   while the tree stacked `open` below the pair. */
	it("the landed pane joins the bar's own axis, so the bar's cells stay true", () => {
		const { core } = makeCore();
		const { open, subtree } = collapsedGroup(core);
		core.dropOnGroupBar(subtree, { kind: "tab", tab: "open", source: open.id });
		const holder = rootOf(core);
		/* every leaf under the bar is reachable by row-nesting alone — the
		   exact condition `renderGroup`'s flatten assumes */
		const rowDepthOnly = (node: DockNode): boolean =>
			"leaf" in node || (node.split === "row" && rowDepthOnly(node.a) && rowDepthOnly(node.b));
		expect(rowDepthOnly(holder)).toBe(true);
	});

	it("a payload from inside the group cannot become its own sibling", () => {
		const { core } = makeCore();
		const { subtree, one } = collapsedGroup(core);
		expect(core.dropOnGroupBar(subtree, { kind: "tab", tab: "a", source: one.id })).toBe(false);
		expect(core.dropOnGroupBar(subtree, { kind: "pane", source: one.id })).toBe(false);
		expect(core.dropOnGroupBar(subtree, { kind: "tree", node: core.state.layout! })).toBe(false);
	});
});

describe("root band and empty layout", () => {
	it("a root drop makes the whole docked tree one side", () => {
		const { core } = makeCore();
		const { left, right } = twoPanes(core);
		const before = core.state.layout!;
		const floated = core.newLeaf(["f"]);
		core.floatAt(floated, 0, 0, 340, 240);
		expect(core.dropOnRoot("t", { kind: "pane", source: floated.id })).toBe(true);
		const root = core.state.layout as DockSplit;
		expect(root.split).toBe("col");
		expect((root.a as DockLeaf).tabs).toEqual(["f"]);
		expect(root.b).toBe(before);
		expect(core.state.floating).toEqual([]);
		expect([...left.tabs, ...right.tabs]).toEqual(["a", "b", "c"]); /* untouched */
	});

	it("a drop on the empty layout becomes the root", () => {
		const { core, marks, notices } = makeCore();
		const windowRoot = core.newLeaf(["f"]);
		core.floatAt(windowRoot, 0, 0, 340, 240);
		expect(core.dropOnEmpty({ kind: "pane", source: windowRoot.id })).toBe(true);
		expect((core.state.layout as DockLeaf).tabs).toEqual(["f"]);
		expect(marks).toContain("redock");
		expect(notices).toContain("root leaf created");
	});
});

describe("external payloads", () => {
	it("ext mints a tab through the consumer port and joins", () => {
		const { core, marks, notices } = makeCore();
		const { right } = twoPanes(core);
		expect(core.dropOnStrip(right, 1, { kind: "ext" }, () => "minted")).toBe(true);
		expect(right.tabs).toEqual(["c", "minted"]);
		expect(right.active).toBe("minted");
		expect(marks).toEqual(["external", "join"]);
		expect(notices).toEqual(["external content joined as tab"]);
	});

	it("ext splits on an edge without a split mark", () => {
		const { core, marks } = makeCore();
		const { right } = twoPanes(core);
		expect(core.dropOnBody(right, "b", { kind: "ext" }, () => "minted")).toBe(true);
		expect(marks).toEqual(["external"]); /* the artifact marks ext splits as external only */
	});

	it("ext with no mint seam lands nothing", () => {
		const { core } = makeCore();
		const { right } = twoPanes(core);
		expect(core.dropOnStrip(right, 0, { kind: "ext" })).toBe(false);
		expect(right.tabs).toEqual(["c"]);
	});
});
