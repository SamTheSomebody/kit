import { describe, expect, it } from "vitest";

import { DOCK_THEME } from "../theme";
import {
	createDockCore,
	isBareLeaf,
	isCollapsedTree,
	isGroupCollapse,
	mergesAsGroup,
	lastCollapsedOf,
	treeContains,
	type DockCore,
} from "../tree";
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

describe("leaves and splits", () => {
	it("newLeaf numbers ids and defaults active to the first tab", () => {
		const { core } = makeCore();
		const first = core.newLeaf(["a", "b"]);
		const second = core.newLeaf(["c"], "c");
		expect(first).toEqual({ leaf: true, id: "L1", tabs: ["a", "b"], active: "a" });
		expect(second.id).toBe("L2");
	});

	it("splitLeaf places the new node on the named edge at ratio .5", () => {
		const { core } = makeCore();
		const target = core.newLeaf(["a"]);
		core.state.layout = target;
		const added = core.newLeaf(["b"]);
		core.splitLeaf(target, "l", added);
		const split = rootOf(core);
		expect(split).toMatchObject({ split: "row", ratio: 0.5 });
		expect(split.a).toBe(added);
		expect(split.b).toBe(target);

		const below = core.newLeaf(["c"]);
		core.splitLeaf(target, "b", below);
		const nested = split.b as DockSplit;
		expect(nested).toMatchObject({ split: "col", ratio: 0.5 });
		expect(nested.a).toBe(target);
		expect(nested.b).toBe(below);
	});

	it("replaceNode reaches the docked root, float roots, and nested children", () => {
		const { core } = makeCore();
		const docked = core.newLeaf(["a"]);
		core.state.layout = docked;
		const floated = core.newLeaf(["f"]);
		core.floatAt(floated, 0, 0, 340, 240);

		const dockedNext = core.newLeaf(["a2"]);
		expect(core.replaceNode(docked, dockedNext)).toBe(true);
		expect(core.state.layout).toBe(dockedNext);

		const floatedNext = core.newLeaf(["f2"]);
		expect(core.replaceNode(floated, floatedNext)).toBe(true);
		expect(core.state.floating[0]!.root).toBe(floatedNext);

		const sibling = core.newLeaf(["b"]);
		core.splitLeaf(dockedNext, "r", sibling);
		const replacement = core.newLeaf(["b2"]);
		expect(core.replaceNode(sibling, replacement)).toBe(true);
		expect(rootOf(core).b).toBe(replacement);
	});

	it("detach lets the sibling absorb, empties the root, and closes float windows", () => {
		const { core } = makeCore();
		const left = core.newLeaf(["a"]);
		const right = core.newLeaf(["b"]);
		core.state.layout = left;
		core.splitLeaf(left, "r", right);
		core.detach(right);
		expect(core.state.layout).toBe(left);

		core.detach(left);
		expect(core.state.layout).toBeNull();

		const windowRoot = core.newLeaf(["f"]);
		core.floatAt(windowRoot, 0, 0, 340, 240);
		core.detach(windowRoot);
		expect(core.state.floating).toEqual([]);
	});

	it("pullTab reassigns active and detaches an emptied leaf", () => {
		const { core } = makeCore();
		const leaf = core.newLeaf(["a", "b", "c"], "b");
		core.state.layout = leaf;
		expect(core.pullTab(leaf, "b")).toBe(false);
		expect(leaf.tabs).toEqual(["a", "c"]);
		expect(leaf.active).toBe("c"); /* the tab that slid into its slot */
		expect(core.pullTab(leaf, "a")).toBe(false);
		expect(core.pullTab(leaf, "c")).toBe(true);
		expect(core.state.layout).toBeNull();
	});
});

describe("collapse", () => {
	it("stamps an increasing collapse sequence and lastCollapsedOf picks the max", () => {
		const { core } = makeCore();
		const first = core.newLeaf(["a"]);
		const second = core.newLeaf(["b"]);
		const third = core.newLeaf(["c"]);
		core.state.layout = first;
		core.splitLeaf(first, "r", second);
		core.splitLeaf(second, "r", third);
		core.collapseGuarded(first);
		core.collapseGuarded(second);
		expect(Number(second.collapsed as number)).toBeGreaterThan(Number(first.collapsed as number));
		expect(lastCollapsedOf(core.state.layout!)).toBe(second);
		expect(lastCollapsedOf(core.state.layout!, second)).toBe(first);
	});

	it("guard: collapsing the docked tree's last open pane reopens the previously-collapsed", () => {
		const { core, marks } = makeCore();
		const left = core.newLeaf(["a"]);
		const right = core.newLeaf(["b"]);
		core.state.layout = left;
		core.splitLeaf(left, "r", right);
		core.collapseGuarded(left);
		core.collapseGuarded(right);
		expect(Boolean(right.collapsed)).toBe(true);
		expect(left.collapsed).toBe(false); /* reopened in its place */
		expect(marks).toEqual(["accordion", "accordion"]);
	});

	it("guard: a single docked leaf refuses to collapse", () => {
		const { core, notices } = makeCore();
		const only = core.newLeaf(["a"]);
		core.state.layout = only;
		core.collapseGuarded(only);
		expect(only.collapsed).toBe(false);
		expect(notices).toEqual(["one pane always stays open"]);
	});

	it("floats are exempt — a fully collapsed float root is the shaded window", () => {
		const { core } = makeCore();
		core.state.layout = core.newLeaf(["dock"]);
		const windowRoot = core.newLeaf(["f"]);
		core.floatAt(windowRoot, 0, 0, 340, 240);
		core.collapseGuarded(windowRoot);
		expect(Boolean(windowRoot.collapsed)).toBe(true);
		expect(isCollapsedTree(core.state.floating[0]!.root)).toBe(true);
	});

	it("collapse is recursive: a split of collapsed children is a group", () => {
		const { core } = makeCore();
		const open = core.newLeaf(["open"]);
		const first = core.newLeaf(["a"]);
		const second = core.newLeaf(["b"]);
		core.state.layout = open;
		core.splitLeaf(open, "r", first);
		core.splitLeaf(first, "b", second);
		core.collapseGuarded(first);
		core.collapseGuarded(second);
		const group = rootOf(core).b;
		expect(isGroupCollapse(group)).toBe(true);
		expect(isGroupCollapse(open)).toBe(false); /* leaves are never groups */
		core.openLeaf(first);
		expect(isGroupCollapse(group)).toBe(false);
		expect(first.collapsed).toBe(false);
	});

	/* A group presents its contents along ONE reading direction, so merging
	   is honest only when the collapsed subtree's panes read that way — its
	   axis perpendicular to the axis it is presented on. Same-axis merges
	   are what put two panes under one chevron. */
	it("merges a fully-collapsed split only across axes, never along its own", () => {
		const rowOf = (a: DockNode, b: DockNode): DockSplit => ({ split: "row", ratio: 0.5, a, b });
		const colOf = (a: DockNode, b: DockNode): DockSplit => ({ split: "col", ratio: 0.5, a, b });
		const shut = (id: string): DockLeaf => ({ leaf: true, id, tabs: [id], active: id, collapsed: 1 });

		/* perpendicular — the group can present them truthfully */
		expect(mergesAsGroup(rowOf(shut("a"), shut("b")), "col")).toBe(true); /* → structural bar */
		expect(mergesAsGroup(colOf(shut("a"), shut("b")), "row")).toBe(true); /* → ▸ rail */

		/* same axis — the parent already lays them out; merging would lie */
		expect(mergesAsGroup(rowOf(shut("a"), shut("b")), "row")).toBe(false);
		expect(mergesAsGroup(colOf(shut("a"), shut("b")), "col")).toBe(false);

		/* a leaf is never a group, and a half-open split never merges */
		expect(mergesAsGroup(shut("a"), "col")).toBe(false);
		const open: DockLeaf = { leaf: true, id: "open", tabs: ["open"], active: "open" };
		expect(mergesAsGroup(rowOf(shut("a"), open), "col")).toBe(false);
	});

	it("openLeaf optionally selects a tab first", () => {
		const { core } = makeCore();
		const leaf = core.newLeaf(["a", "b"]);
		core.state.layout = leaf;
		leaf.collapsed = 3;
		core.openLeaf(leaf, "b");
		expect(leaf.active).toBe("b");
		expect(leaf.collapsed).toBe(false);
	});
});

describe("floats", () => {
	it("floatAt stacks above everything and raiseFloat re-fronts", () => {
		const { core, marks } = makeCore();
		core.floatAt(core.newLeaf(["a"]), 10, 20, 340, 240);
		core.floatAt(core.newLeaf(["b"]), 30, 40, 340, 240);
		const [first, second] = core.state.floating;
		expect(second!.z).toBeGreaterThan(first!.z);
		expect(core.topZ()).toBe(second!.z);
		expect(core.raiseFloat(second!)).toBe(false); /* already front */
		expect(core.raiseFloat(first!)).toBe(true);
		expect(first!.z).toBe(core.topZ());
		expect(marks).toContain("zmove");
	});

	it("findLeaf and floatOf search both trees", () => {
		const { core } = makeCore();
		const docked = core.newLeaf(["a"]);
		core.state.layout = docked;
		const floated = core.newLeaf(["f"]);
		core.floatAt(floated, 0, 0, 340, 240);
		expect(core.findLeaf(docked.id)).toBe(docked);
		expect(core.findLeaf(floated.id)).toBe(floated);
		expect(core.floatOf(floated)).toBe(core.state.floating[0]);
		expect(core.floatOf(docked)).toBeNull();
		expect(treeContains(core.state.floating[0]!.root, floated)).toBe(true);
	});
});

describe("closeTab", () => {
	it("closing the last tab collapses the pane into its sibling", () => {
		const { core, marks, notices } = makeCore();
		const keep = core.newLeaf(["keep"]);
		const close = core.newLeaf(["only"]);
		core.state.layout = keep;
		core.splitLeaf(keep, "r", close);
		core.closeTab(close, "only");
		expect(core.state.layout).toBe(keep);
		expect(marks).toContain("collapse");
		expect(notices).toContain("pane closed — sibling absorbed the space");
	});

	it("closing a float's last tab closes the window", () => {
		const { core, notices } = makeCore();
		const windowRoot = core.newLeaf(["only"]);
		core.floatAt(windowRoot, 0, 0, 340, 240);
		core.closeTab(windowRoot as DockLeaf, "only");
		expect(core.state.floating).toEqual([]);
		expect(notices).toContain("window closed");
	});
});

describe("evenSplits", () => {
	/** Share of the whole run each pane ends up with, in tree order. */
	const shares = (node: DockNode, axis: "row" | "col", carry = 1): number[] =>
		"leaf" in node || node.split !== axis
			? [carry]
			: [...shares(node.a, axis, carry * node.ratio), ...shares(node.b, axis, carry * (1 - node.ratio))];

	const rowRun = (core: DockCore, count: number): DockSplit => {
		/* A | B | C … built the way the UI builds it: drop on the same pane's
		   right edge again and again. Each drop halves that pane, which is
		   exactly how three panes end up 25/25/50. */
		const first = core.newLeaf(["p0"]);
		core.state.layout = first;
		for (let at = 1; at < count; at += 1) {
			core.splitLeaf(first, "r", core.newLeaf([`p${at}`]));
		}
		return rootOf(core);
	};

	it("three panes go 25/25/50 → a third each", () => {
		const { core } = makeCore();
		const root = rowRun(core, 3);
		expect(shares(root, "row")).toEqual([0.25, 0.25, 0.5]); /* the reported state */
		expect(core.evenSplits(root)).toBe(3);
		for (const share of shares(root, "row")) {
			expect(share).toBeCloseTo(1 / 3, 10);
		}
	});

	it("four panes land on a quarter each, and N on 1/N", () => {
		for (const count of [2, 4, 5, 8]) {
			const { core } = makeCore();
			const root = rowRun(core, count);
			expect(core.evenSplits(root)).toBe(count);
			for (const share of shares(root, "row")) {
				expect(share).toBeCloseTo(1 / count, 10);
			}
		}
	});

	/* Any divider in the run means the same thing. Scoped to the clicked
	   split alone, the innermost one would only halve its own half. */
	it("evens the whole run from ANY divider in it, not just the clicked split", () => {
		const { core } = makeCore();
		const root = rowRun(core, 3);
		const innermost = root.a as DockSplit; /* the inner divider, two panes deep */
		expect(core.evenSplits(innermost)).toBe(3);
		for (const share of shares(root, "row")) {
			expect(share).toBeCloseTo(1 / 3, 10);
		}
	});

	/* A stack inside a row is ONE pane on the row's axis, and evening the
	   row must not reach into it. */
	it("treats a cross-axis split as one pane and leaves its ratios alone", () => {
		const { core } = makeCore();
		const left = core.newLeaf(["a"]);
		const right = core.newLeaf(["b"]);
		const under = core.newLeaf(["c"]);
		core.state.layout = left;
		core.splitLeaf(left, "r", right);
		core.splitLeaf(right, "b", under); /* right becomes a col stack */
		const root = rootOf(core);
		const stack = root.b as DockSplit;
		stack.ratio = 0.8;
		expect(core.evenSplits(root)).toBe(2);
		expect(root.ratio).toBeCloseTo(0.5, 10);
		expect(stack.ratio).toBe(0.8); /* untouched */
	});

	it("reports the reset mark", () => {
		const { core, marks } = makeCore();
		const root = rowRun(core, 3);
		core.evenSplits(root);
		expect(marks).toContain("reset");
	});
});

/* A bare leaf renders with no tab strip at all — the root solo pane always,
   every docked single-tab pane once focus mode is on. The three exceptions
   are the whole point: the strip stays wherever it is load-bearing. */
describe("isBareLeaf", () => {
	const stage = (core: DockCore): { left: DockLeaf; right: DockLeaf } => {
		const left = core.newLeaf(["game"]);
		const right = core.newLeaf(["timeline"]);
		core.state.layout = left;
		core.splitLeaf(left, "r", right);
		return { left, right };
	};

	it("bares the root solo pane whether or not focus mode is on", () => {
		const { core } = makeCore();
		const only = core.newLeaf(["game"]);
		core.state.layout = only;
		expect(isBareLeaf(core.state, only, false)).toBe(true);
	});

	it("leaves every other single-tab pane alone until focus mode is on", () => {
		const { core } = makeCore();
		const { left, right } = stage(core);
		expect(isBareLeaf(core.state, left, false)).toBe(false);
		core.state.hideSingleTabBars = true;
		expect(isBareLeaf(core.state, left, false)).toBe(true);
		expect(isBareLeaf(core.state, right, false)).toBe(true);
	});

	it("keeps the strip on a pane with a choice to offer — two tabs or more", () => {
		const { core } = makeCore();
		const left = core.newLeaf(["game", "assets"]);
		core.state.layout = left;
		core.splitLeaf(left, "r", core.newLeaf(["timeline"]));
		core.state.hideSingleTabBars = true;
		expect(isBareLeaf(core.state, left, false)).toBe(false);
	});

	it("keeps the strip on a collapsed pane — collapsed, the strip IS the pane", () => {
		const { core } = makeCore();
		const { left } = stage(core);
		core.state.hideSingleTabBars = true;
		core.collapseGuarded(left);
		expect(isBareLeaf(core.state, left, false)).toBe(false);
	});

	it("keeps the strip inside a float — it carries the grip that moves the window", () => {
		const { core } = makeCore();
		const { left } = stage(core);
		core.state.hideSingleTabBars = true;
		expect(isBareLeaf(core.state, left, true)).toBe(false);
	});
});
