/**
 * Dock kit tree core — the signed artifact's §2 (state + pure structural
 * ops) and its payload-landing rules, ported 1:1 and DOM-free.
 *
 * ONE node shape everywhere: the docked layout and every float root are the
 * same binary tree. All structural ops go through `replaceNode`/`detach`, so
 * docked and floating trees can never diverge in behavior.
 */

import type {
	DockDragPayload,
	DockFloat,
	DockLeaf,
	DockMark,
	DockNode,
	DockSerialized,
	DockSplit,
	DockZone,
} from "./types";

export type DockCoreEvents = { mark(kind: DockMark): void; notify(text: string): void };

/** A resolved drop: the payload pulled from its source, ready to land.
 *  `"same"` = dropped on/into itself; `null` = nothing to land. */
export type TakenPayload = { tabs: string[]; active?: string | null; tree?: DockNode } | "same" | null;

/** Mints a tab id for an external ("ext") payload — the consumer port. */
export type MintTab = () => string;

export const eachLeafOf = (node: DockNode, visit: (leaf: DockLeaf) => void): void => {
	if ("leaf" in node) {
		visit(node);
	} else {
		eachLeafOf(node.a, visit);
		eachLeafOf(node.b, visit);
	}
};

export const isCollapsedTree = (node: DockNode): boolean =>
	"leaf" in node ? Boolean(node.collapsed) : isCollapsedTree(node.a) && isCollapsedTree(node.b);

export const treeContains = (tree: DockNode, node: DockNode): boolean =>
	tree === node || (!("leaf" in tree) && (treeContains(tree.a, node) || treeContains(tree.b, node)));

/** A fully-collapsed split — the candidate for merging into one group. */
export const isGroupCollapse = (node: DockNode): boolean => !("leaf" in node) && isCollapsedTree(node);

/**
 * Whether a fully-collapsed split MERGES into one group when presented on
 * `presentedOn` (its parent's axis; a float root is presented on `"col"`).
 *
 * A group presents its contents along a single reading direction — the bar
 * reads left-to-right, the rail is one glyph — so merging is only honest
 * when the collapsed subtree's panes actually read that way, which is when
 * its axis is PERPENDICULAR to the axis it is presented on. A `row` under a
 * `col` parent becomes the horizontal bar, and its panes really do read
 * left-to-right, one title cell each.
 *
 * When the axes AGREE there is nothing to merge and merging can only lie:
 * the parent's own layout already places the children correctly, side by
 * side or stacked, and each keeps its own collapsed chrome. Merging a
 * `row` under a `row` is what collapsed `ref a | ref b | paytable` into
 * `▸ | paytable` — two panes wearing one chevron, with no way to reopen or
 * drag either on its own; it now stays `▸ | ▸ | paytable`. Merging a `col`
 * under a `col` is the same fault the other way up: the bar would draw its
 * stacked panes side by side. ([HUMAN] Sam, 2026-09-03.)
 */
export const mergesAsGroup = (node: DockNode, presentedOn: "row" | "col"): boolean =>
	isGroupCollapse(node) && (node as DockSplit).split !== presentedOn;

/**
 * Whether a leaf renders BARE — no tab strip at all, hover included, so its
 * content owns the pane.
 *
 * Two ways in, and both mean the same thing: the bar carries no choice.
 *
 *  1. The root solo pane — the whole docked tree is one pane holding one tab
 *     (a dev game as the sole base pane). Always bare; there is nothing else
 *     on the stage for a heading to distinguish it from.
 *  2. `hideSingleTabBars`, the focus-mode toggle: EVERY docked pane holding
 *     one tab goes bare, so a four-pane grid of single tabs reads as four
 *     panes of content rather than four headings.
 *
 * Three panes keep their strip either way. A pane with two or more tabs,
 * because the strip is the only way to choose between them. A COLLAPSED
 * pane, because collapsed the strip *is* the pane — hiding it would erase
 * it from the stage with no way back. And a pane inside a FLOAT, because a
 * float's strip carries the ⠿ grip, the one surface that moves the window.
 *
 * A bare pane has no drag source (the strip is what you grab) — it is still
 * a drop target on all five zones, and showing the bars again brings the
 * grab handle back.
 */
export const isBareLeaf = (state: DockSerialized, leaf: DockLeaf, inFloat: boolean): boolean => {
	if (leaf.tabs.length !== 1 || leaf.collapsed) {
		return false;
	}
	if (state.layout === leaf) {
		return true;
	}
	return state.hideSingleTabBars === true && !inFloat;
};

/** CSS `column` is the usual typo for the kit's `col`. Anything else is refuse. */
const splitAxisOf = (value: unknown): "row" | "col" | null => {
	if (value === "row" || value === "col") {
		return value;
	}
	if (value === "column") {
		return "col";
	}
	return null;
};

const normalizeNode = (node: DockNode): boolean => {
	if ("leaf" in node && node.leaf) {
		return true;
	}
	if (!("a" in node) || !("b" in node)) {
		return false;
	}
	const axis = splitAxisOf(node.split);
	if (!axis) {
		return false;
	}
	node.split = axis;
	return normalizeNode(node.a) && normalizeNode(node.b);
};

const normalizeSerialized = (next: DockSerialized): boolean => {
	if (next.layout !== null && next.layout !== undefined && !normalizeNode(next.layout)) {
		return false;
	}
	for (const float of next.floating ?? []) {
		if (!normalizeNode(float.root)) {
			return false;
		}
	}
	return true;
};

/** `collapsed` is the collapse sequence № — reopeners pick the max. */
export const lastCollapsedOf = (node: DockNode, except?: DockLeaf): DockLeaf | null => {
	let best: DockLeaf | null = null;
	eachLeafOf(node, (leaf) => {
		if (
			leaf !== except &&
			leaf.collapsed &&
			(!best || (Number(leaf.collapsed) || 0) > (Number(best.collapsed ?? 0) || 0))
		) {
			best = leaf;
		}
	});
	return best;
};

export type DockCore = {
	readonly state: DockSerialized;
	newLeaf(tabs: string[], active?: string): DockLeaf;
	eachLeaf(visit: (leaf: DockLeaf) => void): void;
	findLeaf(id: string): DockLeaf | null;
	floatOf(node: DockNode): DockFloat | null;
	topZ(): number;
	collapseGuarded(leaf: DockLeaf): void;
	openLeaf(leaf: DockLeaf | null, tabId?: string): void;
	replaceNode(target: DockNode, replacement: DockNode): boolean;
	detach(node: DockNode): void;
	pullTab(leaf: DockLeaf, tabId: string): boolean;
	splitLeaf(target: DockNode, edge: Exclude<DockZone, "c">, added: DockNode): void;
	/** Even out every pane on this divider's axis; returns the pane count. */
	evenSplits(node: DockSplit): number;
	floatAt(node: DockNode, x: number, y: number, w: number, h: number): void;
	raiseFloat(float: DockFloat): boolean;
	serialize(): string;
	hydrate(json: string, known?: (id: string) => boolean): void;
	takeDrag(drag: DockDragPayload, target?: DockLeaf, mintTab?: MintTab): TakenPayload;
	dropOnStrip(leaf: DockLeaf, index: number, drag: DockDragPayload, mintTab?: MintTab): boolean;
	dropOnBody(leaf: DockLeaf, zone: DockZone, drag: DockDragPayload, mintTab?: MintTab): boolean;
	dropOnGroupBar(subtree: DockNode, drag: DockDragPayload, mintTab?: MintTab): boolean;
	dropOnRoot(zone: Exclude<DockZone, "c">, drag: DockDragPayload, mintTab?: MintTab): boolean;
	dropAsFloat(x: number, y: number, w: number, h: number, drag: DockDragPayload, mintTab?: MintTab): boolean;
	dropOnEmpty(drag: DockDragPayload, mintTab?: MintTab): boolean;
	closeTab(leaf: DockLeaf, tabId: string): void;
};

/**
 * @param floatBaseZ first float z — pass the theme's `zFloatBase`.
 */
export const createDockCore = (events: DockCoreEvents, floatBaseZ: number): DockCore => {
	const { mark, notify } = events;
	let leafSequence = 0;
	let floatSequence = 0;
	let topZ = floatBaseZ;
	let collapseSequence = 0;
	let state: DockSerialized = { v: 1, layout: null, floating: [] };

	const newLeaf = (tabs: string[], active?: string): DockLeaf => ({
		leaf: true,
		id: `L${++leafSequence}`,
		tabs,
		active: active ?? tabs[0] ?? null,
	});

	const eachLeaf = (visit: (leaf: DockLeaf) => void): void => {
		if (state.layout) {
			eachLeafOf(state.layout, visit);
		}
		state.floating.forEach((float) => eachLeafOf(float.root, visit));
	};

	const findLeaf = (id: string): DockLeaf | null => {
		let hit: DockLeaf | null = null;
		eachLeaf((leaf) => {
			if (leaf.id === id) {
				hit = leaf;
			}
		});
		return hit;
	};

	const floatOf = (node: DockNode): DockFloat | null =>
		state.floating.find((float) => treeContains(float.root, node)) ?? null;

	/* Collapse a pane. The DOCKED tree keeps ≥1 expanded pane: if this was
	   its last open pane, the previously-collapsed one reopens instead
	   (single leaf: refused). Floats are exempt — fully collapsed = shaded. */
	const collapseGuarded = (leaf: DockLeaf): void => {
		leaf.collapsed = ++collapseSequence;
		if (state.layout && isCollapsedTree(state.layout) && !floatOf(leaf)) {
			const previouslyCollapsed = lastCollapsedOf(state.layout, leaf);
			if (previouslyCollapsed) {
				previouslyCollapsed.collapsed = false;
			} else {
				leaf.collapsed = false;
				notify("one pane always stays open");
			}
		}
		mark("accordion");
	};

	/** The single expand path — optionally selecting a tab first. */
	const openLeaf = (leaf: DockLeaf | null, tabId?: string): void => {
		if (!leaf) {
			return;
		}
		if (tabId !== undefined) {
			leaf.active = tabId;
		}
		leaf.collapsed = false;
		mark("accordion");
	};

	/* Replace `target` wherever it sits — docked root, float root, or either
	   child of any split in any tree. */
	const replaceNode = (target: DockNode, replacement: DockNode): boolean => {
		if (state.layout === target) {
			state.layout = replacement;
			return true;
		}
		const floatRoot = state.floating.find((float) => float.root === target);
		if (floatRoot) {
			floatRoot.root = replacement;
			return true;
		}
		const walk = (node: DockNode | null): boolean => {
			if (!node || "leaf" in node) {
				return false;
			}
			if (node.a === target) {
				node.a = replacement;
				return true;
			}
			if (node.b === target) {
				node.b = replacement;
				return true;
			}
			return walk(node.a) || walk(node.b);
		};
		return walk(state.layout) || state.floating.some((float) => walk(float.root));
	};

	/* Remove a node — leaf or subtree, docked or floating. A float whose root
	   leaves closes its window; the docked root leaves an empty layout;
	   anywhere else the sibling absorbs the space. */
	const detach = (node: DockNode): void => {
		const holder = state.floating.find((float) => float.root === node);
		if (holder) {
			state.floating = state.floating.filter((float) => float !== holder);
			return;
		}
		if (state.layout === node) {
			state.layout = null;
			return;
		}
		const walk = (parent: DockNode | null): boolean => {
			if (!parent || "leaf" in parent) {
				return false;
			}
			if (parent.a === node || parent.b === node) {
				return replaceNode(parent, parent.a === node ? parent.b : parent.a);
			}
			return walk(parent.a) || walk(parent.b);
		};
		if (!walk(state.layout)) {
			state.floating.some((float) => walk(float.root));
		}
	};

	/** Pull a tab out of its leaf (detaching if emptied); true if the leaf died. */
	const pullTab = (leaf: DockLeaf, tabId: string): boolean => {
		const at = leaf.tabs.indexOf(tabId);
		if (at < 0) {
			return false;
		}
		leaf.tabs.splice(at, 1);
		if (leaf.active === tabId) {
			leaf.active = leaf.tabs[Math.min(at, leaf.tabs.length - 1)] ?? null;
		}
		if (!leaf.tabs.length) {
			detach(leaf);
			return true;
		}
		return false;
	};

	/** The split holding `node` as a direct child — docked tree or any float. */
	const parentOf = (node: DockNode): DockSplit | null => {
		let hit: DockSplit | null = null;
		const walk = (candidate: DockNode | null): void => {
			if (!candidate || "leaf" in candidate || hit) {
				return;
			}
			if (candidate.a === node || candidate.b === node) {
				hit = candidate;
			} else {
				walk(candidate.a);
				walk(candidate.b);
			}
		};
		walk(state.layout);
		for (const float of state.floating) {
			walk(float.root);
		}
		return hit;
	};

	/* Panes as the RUN sees them: a same-axis split is a step on the way to
	   more panes, anything else (a leaf, or a split across the axis) is one
	   pane however deep it goes. */
	const paneCount = (node: DockNode, axis: "row" | "col"): number =>
		"leaf" in node || node.split !== axis ? 1 : paneCount(node.a, axis) + paneCount(node.b, axis);

	/* Give every pane of the run the same share. The tree is binary, so
	   "even" is not 0.5 everywhere: a split's ratio is how many panes sit on
	   its `a` side out of its own total, and the products then come out
	   equal — row{row{A,B},C} is 2/3 then 1/2, so A=B=C=1/3. */
	const spreadRun = (node: DockNode, axis: "row" | "col"): void => {
		if ("leaf" in node || node.split !== axis) {
			return;
		}
		const before = paneCount(node.a, axis);
		node.ratio = before / (before + paneCount(node.b, axis));
		spreadRun(node.a, axis);
		spreadRun(node.b, axis);
	};

	/**
	 * Even out every pane sharing this divider's axis, and report how many
	 * there were. The run is the MAXIMAL span of same-axis splits around
	 * `node` — walk up while the parent shares the axis — so it does not
	 * matter which of a row's dividers is hit: they all mean the same thing,
	 * "space this row evenly". Scoping it to the clicked split alone would
	 * make the inner divider of `A | B | C` set A and B to half of their
	 * shared half, which is the 25/25/50 the even-out is asked for.
	 *
	 * Splits ACROSS the axis are single panes here and keep their own
	 * ratios — evening a row never disturbs the stacks inside it.
	 */
	const evenSplits = (node: DockSplit): number => {
		let top = node;
		for (;;) {
			const parent = parentOf(top);
			if (!parent || parent.split !== top.split) {
				break;
			}
			top = parent;
		}
		spreadRun(top, top.split);
		mark("reset");
		return paneCount(top, top.split);
	};

	/** Split `target` on `edge` (l|r|t|b); the new node takes half. */
	const splitLeaf = (target: DockNode, edge: Exclude<DockZone, "c">, added: DockNode): void => {
		const horizontal = edge === "l" || edge === "r";
		const first = edge === "l" || edge === "t";
		const split: DockNode = {
			split: horizontal ? "row" : "col",
			ratio: 0.5,
			a: first ? added : target,
			b: first ? target : added,
		};
		replaceNode(target, split);
	};

	const floatAt = (node: DockNode, x: number, y: number, w: number, h: number): void => {
		state.floating.push({
			id: `F${++floatSequence}`,
			x: Math.round(x),
			y: Math.round(y),
			w,
			h,
			z: ++topZ,
			root: node,
		});
	};

	/** Bring a float to the front; false if it already is. */
	const raiseFloat = (float: DockFloat): boolean => {
		if (float.z === topZ) {
			return false;
		}
		float.z = ++topZ;
		mark("zmove");
		return true;
	};

	const serialize = (): string => JSON.stringify(state);
	/**
	 * Restore a layout, dropping tab ids `known` rejects.
	 *
	 * A persisted layout names tabs, and by the time it is read some of them
	 * are gone — a run the server forgot, a tool dropped from the registry.
	 * Rendering already skips an unknown id, but without pruning the dead one
	 * stays in the tree forever, `active` can point at it (so the pane draws
	 * nothing), and a leaf whose tabs all died holds space showing nothing.
	 * Every consumer that persists would otherwise write this same walk.
	 */
	const hydrate = (json: string, known?: (id: string) => boolean): void => {
		const next = JSON.parse(json) as DockSerialized;
		if (!normalizeSerialized(next)) {
			notify("layout ignored — invalid split");
			return;
		}
		state = next;
		if (known) {
			prune(known);
		}
		eachLeaf((leaf) => {
			const sequence = Number(leaf.id.slice(1));
			if (sequence > leafSequence) {
				leafSequence = sequence;
			}
			if ((Number(leaf.collapsed ?? 0) || 0) > collapseSequence) {
				collapseSequence = Number(leaf.collapsed ?? 0);
			}
		});
		state.floating.forEach((float) => {
			const sequence = Number(float.id.slice(1));
			if (sequence > floatSequence) {
				floatSequence = sequence;
			}
			if (float.z > topZ) {
				topZ = float.z;
			}
		});
	};

	/* Resolve the drag into a payload, pulling it from the source.
	   "tab" carries one tab; "pane" the source leaf's whole tab set (the
	   leaf is detached — its sibling absorbs); "tree" a whole subtree
	   (detached, expanded; ALSO flattened to tabs so join targets can take
	   it); "ext" mints a new tab. */
	const takeDrag = (drag: DockDragPayload, target?: DockLeaf, mintTab?: MintTab): TakenPayload => {
		if (drag.kind === "ext") {
			if (!mintTab) {
				return null;
			}
			mark("external");
			return { tabs: [mintTab()] };
		}
		if (drag.kind === "tree") {
			const tree = drag.node;
			if (target && treeContains(tree, target)) {
				return "same";
			}
			drag.wasFloat = state.floating.some((float) => float.root === tree || treeContains(float.root, tree));
			detach(tree);
			const tabs: string[] = [];
			let active: string | null = null;
			let bestSequence = -1;
			eachLeafOf(tree, (leaf) => {
				tabs.push(...leaf.tabs);
				if ((Number(leaf.collapsed ?? 0) || 0) >= bestSequence) {
					bestSequence = Number(leaf.collapsed ?? 0) || 0;
					active = leaf.active;
				}
				leaf.collapsed = false; /* a drop always lands expanded */
			});
			return { tabs, active: active ?? tabs[0], tree };
		}
		const source = findLeaf(drag.source);
		if (!source) {
			return null;
		}
		if (target && source === target) {
			return "same";
		}
		drag.wasFloat = Boolean(floatOf(source));
		if (drag.kind === "pane") {
			const payload = { tabs: [...source.tabs], active: source.active };
			source.tabs.length = 0;
			detach(source);
			return payload;
		}
		pullTab(source, drag.tab);
		return { tabs: [drag.tab], active: drag.tab };
	};

	/** Join at a strip index; own strip = reorder. Returns whether state changed. */
	const dropOnStrip = (leaf: DockLeaf, index: number, drag: DockDragPayload, mintTab?: MintTab): boolean => {
		const got = takeDrag(drag, leaf, mintTab);
		if (got === null) {
			return false;
		}
		if (got === "same") {
			if (drag.kind !== "tab") {
				return false;
			} /* pane/tree on itself: no-op */
			const from = leaf.tabs.indexOf(drag.tab); /* reorder in place */
			leaf.tabs.splice(from, 1);
			if (index > from) {
				index -= 1;
			}
			leaf.tabs.splice(index, 0, drag.tab);
			leaf.active = drag.tab;
			mark("reorder");
			notify("tab reordered");
			return true;
		}
		leaf.tabs.splice(Math.max(0, Math.min(index, leaf.tabs.length)), 0, ...got.tabs);
		leaf.active = got.active ?? got.tabs[0] ?? null;
		leaf.collapsed = false;
		mark("join");
		if (drag.wasFloat) {
			mark("redock");
		}
		notify(
			{
				ext: "external content joined as tab",
				pane: "pane merged",
				tree: "split merged",
				tab: "tab moved",
			}[drag.kind],
		);
		return true;
	};

	/** 5-zone body drop: 30% edge bands split, the centre joins. */
	const dropOnBody = (leaf: DockLeaf, zone: DockZone, drag: DockDragPayload, mintTab?: MintTab): boolean => {
		if (zone === "c") {
			return dropOnStrip(leaf, leaf.tabs.length, drag, mintTab);
		}
		if (drag.kind === "tab" && drag.source === leaf.id && leaf.tabs.length === 1) {
			return false;
		} /* sole tab → own edge: no-op */
		if (drag.kind === "pane" && drag.source === leaf.id) {
			return false;
		} /* pane → own edge: no-op */
		if (drag.kind === "tree" && treeContains(drag.node, leaf)) {
			return false;
		} /* tree → its own leaf: no-op */
		const got = takeDrag(drag, undefined, mintTab);
		if (got === null || got === "same") {
			return false;
		}
		/* a tree payload splices in whole — its internal splits survive */
		splitLeaf(leaf, zone, got.tree ?? newLeaf(got.tabs, got.active ?? undefined));
		if (drag.kind !== "ext") {
			mark("split");
			if (drag.wasFloat) {
				mark("redock");
			}
		}
		notify(`new split — ${{ l: "left", r: "right", t: "top", b: "bottom" }[zone]}`);
		return true;
	};

	/* A drop on a group bar's EMPTY area always becomes a NEW pane, landing
	   expanded. Joining as a tab is the CELLS' job.

	   The new pane joins the group on the BAR'S OWN AXIS — a `row` sibling,
	   placed after the group so it lands where the empty area the drop hit
	   is. `dropOnGroupBar` is reached only from a horizontal bar (a `▸` rail
	   joins into its last-collapsed leaf instead, and never lands here), and
	   a bar reads left-to-right, so `row` is the only honest answer.

	   It has to be, because the bar FLATTENS row-nesting: every leaf at any
	   row-depth gets its own title cell. Wrap the group in a `col` instead
	   and the payload still flattens into the bar as a peer cell of the
	   group's panes — the bar would show "ref a | ref b | log" while the
	   tree said log was stacked BELOW the refs, and expanding would be the
	   first the reader heard of it. A `row` makes the presentation true:
	   what the bar draws as three side-by-side cells really is three
	   side-by-side panes. ([HUMAN] Sam, 2026-09-03 — correcting the
	   "col split under the bar" rule of the signed artifact; the drop
	   splices into the group's row rather than nesting a level under it.) */
	const dropOnGroupBar = (subtree: DockNode, drag: DockDragPayload, mintTab?: MintTab): boolean => {
		/* a payload from inside this group can't become its own sibling */
		const sourceNode: DockNode | null =
			drag.kind === "tree" ? drag.node : drag.kind === "ext" ? null : (findLeaf(drag.source) ?? null);
		if (
			sourceNode &&
			(treeContains(subtree, sourceNode) || (!("leaf" in sourceNode) && treeContains(sourceNode, subtree)))
		) {
			return false;
		}
		const got = takeDrag(drag, undefined, mintTab);
		if (got === null || got === "same") {
			return false;
		}
		replaceNode(subtree, {
			split: "row",
			ratio: 0.5,
			a: subtree,
			b: got.tree ?? newLeaf(got.tabs, got.active ?? undefined),
		});
		mark("split");
		if (drag.wasFloat) {
			mark("redock");
		}
		notify("new split");
		return true;
	};

	/** The stage's root band splits at the ROOT — the whole docked tree becomes one side. */
	const dropOnRoot = (zone: Exclude<DockZone, "c">, drag: DockDragPayload, mintTab?: MintTab): boolean => {
		const got = takeDrag(drag, undefined, mintTab);
		if (got === null || got === "same") {
			return false;
		}
		const added = got.tree ?? newLeaf(got.tabs, got.active ?? undefined);
		const horizontal = zone === "l" || zone === "r";
		const first = zone === "l" || zone === "t";
		state.layout = state.layout
			? {
					split: horizontal ? "row" : "col",
					ratio: 0.5,
					a: first ? added : state.layout,
					b: first ? state.layout : added,
				}
			: added;
		mark("rootsplit");
		notify(`root split — ${{ l: "left", r: "right", t: "top", b: "bottom" }[zone]}`);
		return true;
	};

	/** ⇧-drop floats the payload — a tree floats WHOLE (floats are trees). */
	const dropAsFloat = (
		x: number,
		y: number,
		w: number,
		h: number,
		drag: DockDragPayload,
		mintTab?: MintTab,
	): boolean => {
		const got = takeDrag(drag, undefined, mintTab);
		if (got === null || got === "same") {
			return false;
		}
		floatAt(got.tree ?? newLeaf(got.tabs, got.active ?? undefined), x, y, w, h);
		if (drag.kind === "tab") {
			mark("float");
		}
		notify("floated — drag its ⠿ grip to move, resize any edge");
		return true;
	};

	/** Empty layout: the payload becomes the root. */
	const dropOnEmpty = (drag: DockDragPayload, mintTab?: MintTab): boolean => {
		const got = takeDrag(drag, undefined, mintTab);
		if (got === null || got === "same") {
			return false;
		}
		state.layout = got.tree ?? newLeaf(got.tabs, got.active ?? undefined);
		if (drag.wasFloat) {
			mark("redock");
		}
		notify("root leaf created");
		return true;
	};

	/* Drop unknown tabs, then the leaves they emptied — the sibling absorbs,
	   exactly as closing a pane's last tab does. A float whose whole tree
	   goes closes with it. */
	const prune = (known: (id: string) => boolean): void => {
		const dead: DockLeaf[] = [];
		eachLeaf((leaf) => {
			const had = leaf.tabs.length;
			leaf.tabs = leaf.tabs.filter((tabId) => known(tabId));
			/* Only a leaf that pruning EMPTIED goes. One that arrived empty is
			   a pane the consumer asked for — a console seeded collapsed and
			   waiting for its first run — and collecting it would drop the id
			   that consumer aims new tabs at. */
			if (leaf.tabs.length === 0) {
				if (had > 0) {
					dead.push(leaf);
				}
			} else if (leaf.active === null || !leaf.tabs.includes(leaf.active)) {
				leaf.active = leaf.tabs[0]!;
			}
		});
		for (const leaf of dead) {
			detach(leaf);
		}
	};

	const closeTab = (leaf: DockLeaf, tabId: string): void => {
		const wasFloat = Boolean(floatOf(leaf));
		if (pullTab(leaf, tabId)) {
			mark("collapse");
			notify(wasFloat ? "window closed" : "pane closed — sibling absorbed the space");
		}
	};

	return {
		get state() {
			return state;
		},
		newLeaf,
		eachLeaf,
		findLeaf,
		floatOf,
		topZ: () => topZ,
		collapseGuarded,
		openLeaf,
		replaceNode,
		detach,
		pullTab,
		splitLeaf,
		evenSplits,
		floatAt,
		raiseFloat,
		serialize,
		hydrate,
		takeDrag,
		dropOnStrip,
		dropOnBody,
		dropOnGroupBar,
		dropOnRoot,
		dropAsFloat,
		dropOnEmpty,
		closeTab,
	};
};
