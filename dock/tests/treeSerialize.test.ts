import { describe, expect, it } from "vitest";

import { DOCK_THEME } from "../theme";
import { createDockCore, isCollapsedTree, lastCollapsedOf, type DockCore } from "../tree";
import type { DockLeaf, DockSplit } from "../types";

const makeCore = (): DockCore => createDockCore({ mark: () => {}, notify: () => {} }, DOCK_THEME.zFloatBase);

/** The fidelity fixture shape: splits + a collapsed group + a shaded float. */
const buildFixture = (core: DockCore): void => {
	const rail = core.newLeaf(["timeline", "config", "assets"]);
	const game = core.newLeaf(["game"]);
	const referenceA = core.newLeaf(["ref-a"]);
	const referenceB = core.newLeaf(["ref-b"]);
	core.state.layout = rail;
	core.splitLeaf(rail, "r", game);
	core.splitLeaf(game, "b", referenceA);
	core.splitLeaf(referenceA, "r", referenceB);
	core.collapseGuarded(referenceA);
	core.collapseGuarded(referenceB); /* fully-collapsed split → group */
	const log = core.newLeaf(["log"]);
	core.floatAt(log, 24, 24, 360, 220);
	core.collapseGuarded(log); /* fully-collapsed float root → shaded */
};

describe("serialize / hydrate", () => {
	it("round-trips byte-identically for the fixture set", () => {
		const core = makeCore();
		buildFixture(core);
		const first = core.serialize();
		core.hydrate(first);
		expect(core.serialize()).toBe(first);
		/* and through a second fresh core */
		const other = makeCore();
		other.hydrate(first);
		expect(other.serialize()).toBe(first);
	});

	it("keeps the serialized envelope shape: {v, layout, floating} with tab ids only", () => {
		const core = makeCore();
		buildFixture(core);
		const parsed = JSON.parse(core.serialize()) as Record<string, unknown>;
		expect(Object.keys(parsed)).toEqual(["v", "layout", "floating"]);
		expect(parsed.v).toBe(1);
		const float = (parsed.floating as Record<string, unknown>[])[0]!;
		expect(Object.keys(float)).toEqual(["id", "x", "y", "w", "h", "z", "root"]);
	});

	/* Focus mode is layout state, so it rides in the envelope and the
	   consumer's existing persistence restores it with the tree. Absent
	   until asked for: every layout written before it existed, and every
	   one where it is off, serializes to the same bytes as before. */
	it("carries hideSingleTabBars only once it is on, and restores it", () => {
		const core = makeCore();
		buildFixture(core);
		expect(Object.keys(JSON.parse(core.serialize()) as object)).not.toContain("hideSingleTabBars");
		core.state.hideSingleTabBars = true;
		const other = makeCore();
		other.hydrate(core.serialize());
		expect(other.state.hideSingleTabBars).toBe(true);
	});

	it("restores collapse state — the shaded float and the group survive reload", () => {
		const core = makeCore();
		buildFixture(core);
		const other = makeCore();
		other.hydrate(core.serialize());
		expect(isCollapsedTree(other.state.floating[0]!.root)).toBe(true);
		const outer = other.state.layout as DockSplit;
		const group = (outer.b as DockSplit).b;
		expect(isCollapsedTree(group)).toBe(true);
	});

	it("rederives counters so new leaves, floats, and collapses never collide", () => {
		const core = makeCore();
		buildFixture(core);
		const other = makeCore();
		other.hydrate(core.serialize());
		const ids = new Set<string>();
		other.eachLeaf((leaf) => ids.add(leaf.id));
		const fresh = other.newLeaf(["new"]);
		expect(ids.has(fresh.id)).toBe(false);
		other.floatAt(fresh, 0, 0, 340, 240);
		const floats = other.state.floating;
		expect(floats[1]!.id).not.toBe(floats[0]!.id);
		expect(floats[1]!.z).toBeGreaterThan(floats[0]!.z);
		/* a new collapse outranks every restored sequence № */
		const game = other.findLeaf("L2")!;
		other.collapseGuarded(game);
		let highest = 0;
		other.eachLeaf((leaf) => {
			if (leaf.collapsed) {
				highest = Math.max(highest, Number(leaf.collapsed));
			}
		});
		expect(Number(game.collapsed as number)).toBe(highest);
	});

	it("most recently collapsed survives reload through the sequence №", () => {
		const core = makeCore();
		buildFixture(core);
		const other = makeCore();
		other.hydrate(core.serialize());
		const outer = other.state.layout as DockSplit;
		const group = (outer.b as DockSplit).b as DockSplit;
		/* ref-b collapsed after ref-a, so the group's reopener is ref-b */
		expect(lastCollapsedOf(group)).toBe(group.b);
	});
});

/* A stored layout outlives the tabs it names — a run the server forgot, a
   tool dropped from the registry. Rendering already skips an unknown id, but
   left in the tree it keeps holding a pane and can be the `active` one, so
   the pane draws nothing. */
describe("hydrate pruning", () => {
	const fixture = (tabs: string[], second?: string[]): string =>
		JSON.stringify({
			v: 1,
			layout: second
				? {
						split: "col",
						ratio: 0.5,
						a: { leaf: true, id: "L1", tabs, active: tabs[0] ?? null },
						b: { leaf: true, id: "L2", tabs: second, active: second[0] ?? null },
					}
				: { leaf: true, id: "L1", tabs, active: tabs[0] ?? null },
			floating: [],
		});
	const knows =
		(...ids: string[]) =>
		(id: string) =>
			ids.includes(id);

	it("drops ids the registry does not know", () => {
		const core = makeCore();
		core.hydrate(fixture(["a", "ghost", "b"]), knows("a", "b"));
		expect((core.state.layout as DockLeaf).tabs).toEqual(["a", "b"]);
	});

	it("repoints active when the active tab was the one that died", () => {
		const core = makeCore();
		core.hydrate(
			JSON.stringify({ v: 1, layout: { leaf: true, id: "L1", tabs: ["ghost", "b"], active: "ghost" }, floating: [] }),
			knows("b"),
		);
		expect((core.state.layout as DockLeaf).active).toBe("b");
	});

	it("detaches a leaf whose tabs all died, and the sibling absorbs", () => {
		const core = makeCore();
		core.hydrate(fixture(["a"], ["ghost-1", "ghost-2"]), knows("a"));
		const root = core.state.layout as DockLeaf;
		expect(root.leaf).toBe(true); /* the split is gone, not just emptied */
		expect(root.tabs).toEqual(["a"]);
	});

	/* A pane the consumer seeded empty is furniture, not debris: lobby aims
	   new runs at its console leaf by id, and collecting it would strand them. */
	it("keeps a leaf that ARRIVED empty, and only drops ones pruning emptied", () => {
		const core = makeCore();
		core.hydrate(
			JSON.stringify({
				v: 1,
				layout: {
					split: "col",
					ratio: 0.5,
					a: { leaf: true, id: "L1", tabs: ["a"], active: "a" },
					b: { leaf: true, id: "L2", tabs: [], active: null, collapsed: 1 },
				},
				floating: [],
			}),
			knows("a"),
		);
		const root = core.state.layout as DockSplit;
		expect((root.b as DockLeaf).id).toBe("L2");
		expect((root.b as DockLeaf).tabs).toEqual([]);
	});

	it("leaves an empty layout when nothing survives", () => {
		const core = makeCore();
		core.hydrate(fixture(["ghost"]), knows());
		expect(core.state.layout).toBeNull();
	});

	it("without a predicate it prunes nothing — the caller opts in", () => {
		const core = makeCore();
		core.hydrate(fixture(["a", "ghost"]));
		expect((core.state.layout as DockLeaf).tabs).toEqual(["a", "ghost"]);
	});
});

describe("hydrate split axis", () => {
	const nestedColumn = JSON.stringify({
		v: 1,
		layout: {
			split: "row",
			ratio: 0.72,
			a: { leaf: true, id: "L1", tabs: ["game"], active: "game" },
			b: {
				split: "column",
				ratio: 0.45,
				a: { leaf: true, id: "L2", tabs: ["layout", "inspector"], active: "layout" },
				b: { leaf: true, id: "L3", tabs: ["editor", "viewport"], active: "editor" },
			},
		},
		floating: [],
	});

	it("coerces CSS column to col so the nested 0.72 tool stack keeps a stylesheet class", () => {
		const core = makeCore();
		core.hydrate(nestedColumn);
		const root = core.state.layout as DockSplit;
		expect(root.split).toBe("row");
		expect(root.ratio).toBe(0.72);
		expect((root.b as DockSplit).split).toBe("col");
		expect(JSON.parse(core.serialize()).layout.b.split).toBe("col");
	});

	it("keeps the live tree when a split axis is not row, col, or column", () => {
		const core = makeCore();
		const keep = core.newLeaf(["keep"]);
		core.state.layout = keep;
		core.hydrate(
			JSON.stringify({
				v: 1,
				layout: {
					split: "diagonal",
					ratio: 0.5,
					a: { leaf: true, id: "L1", tabs: ["a"], active: "a" },
					b: { leaf: true, id: "L2", tabs: ["b"], active: "b" },
				},
				floating: [],
			}),
		);
		expect(core.state.layout).toBe(keep);
	});
});
