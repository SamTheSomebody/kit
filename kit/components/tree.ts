/* The tree's rules, with no DOM in them.
 *
 * The artifact's version walked the DOM for all of this — which is how the
 * twisty came to be dead in the plain tree (row selection ran first, and a
 * twisty lives inside a row) and how a drag could leave a parent claiming
 * "2/3" with nothing beneath it checked. Both are rules about a shape, so
 * they belong to a shape, and `tree.test.ts` holds them.
 */

export type TreeNode = {
	id: string;
	label: string;
	children?: TreeNode[];
	/* a count beside the label, for a multi-select parent */
	count?: boolean;
	disabled?: boolean;
};

export type TreeRow = {
	node: TreeNode;
	depth: number;
	parentId?: string;
	leaf: boolean;
};

/* Rows in the order they are drawn — collapsed subtrees contribute nothing,
   which is also what makes keyboard movement "next VISIBLE row". */
export const visibleRows = (nodes: TreeNode[], expanded: ReadonlySet<string>): TreeRow[] => {
	const rows: TreeRow[] = [];
	const walk = (list: TreeNode[], depth: number, parentId?: string): void => {
		for (const node of list) {
			const leaf = !node.children || node.children.length === 0;
			rows.push({ node, depth, parentId, leaf });
			if (!leaf && expanded.has(node.id)) {
				walk(node.children ?? [], depth + 1, node.id);
			}
		}
	};
	walk(nodes, 0);
	return rows;
};

/**
 * The subset of a pointer event a fold gesture reads. Structural rather than a
 * `MouseEvent`, so this file stays DOM-free and a test can state the gesture
 * as data.
 */
export type FoldGesture = {
	readonly metaKey?: boolean;
	readonly ctrlKey?: boolean;
	readonly altKey?: boolean;
	/** `1` is the middle button, in every DOM event that carries one. */
	readonly button?: number;
};

/**
 * Does this click mean the BRANCH, rather than the one row under the pointer?
 *
 * A modifier held with it — cmd, ctrl or alt, all three because the same
 * gesture has a different natural spelling on each platform and a tree is not
 * the place to be dogmatic about it — or the middle button.
 *
 * It lives here, in the rules, because it is the thing that has to be
 * IDENTICAL in every tree in the estate. A gesture that worked in one panel
 * and not the next would be worse than not having it.
 */
export const foldsBranch = (event: FoldGesture): boolean =>
	event.metaKey === true || event.ctrlKey === true || event.altKey === true || event.button === 1;

/**
 * A fold over a set of foldable ids — a branch, from `foldBranch` — expressed
 * as the ids that end up SHUT.
 *
 * Polarity-free on purpose: the kit's `Tree` tracks what is EXPANDED (its rows
 * default closed) and the layout inspector tracks what is COLLAPSED (its rows
 * default open), and both are right for their own content. What they must
 * share is the DECISION, so this takes "which of these is currently open" and
 * answers "which should now be shut" — each caller writes that into whichever
 * set it keeps, TOUCHING NOTHING OUTSIDE THE SET IT WAS GIVEN.
 *
 * A TOGGLE, not a one-way collapse: a gesture that only ever folded would need
 * a second, different gesture to undo it, and reopening is usually the next
 * thing you want. Anything in the branch still open means the gesture folds;
 * nothing open means it unfolds the branch.
 *
 * Generic in the id, because the rule has nothing to do with what an id IS.
 * The kit's `Tree` keys by string and the layout inspector keys by number, and
 * neither should have to stringify at the call site to reach a shared rule.
 */
export const foldAll = <T>(foldable: readonly T[], isOpen: (id: T) => boolean): T[] =>
	foldable.some((id) => isOpen(id)) ? [...foldable] : [];

/**
 * One row of a tree, flattened: an id, how deep it sits, and whether it has
 * anything to fold. It is all a branch rule needs, and stating it as a shape
 * rather than as `TreeNode` is what lets the kit's `Tree` (a node tree, keyed
 * by string) and the layout inspector (a flat scene list, keyed by number)
 * reach the same rule.
 *
 * The list must be in DRAW ORDER and must hold every row, including the ones
 * a collapsed ancestor is currently hiding — a fold that skipped those would
 * leave a subtree half open behind the node it just shut.
 */
export type BranchRow<T> = {
	readonly id: T;
	readonly depth: number;
	readonly hasChildren: boolean;
};

/** A node tree flattened into that shape, collapse ignored. */
export const branchRows = (nodes: readonly TreeNode[]): BranchRow<string>[] => {
	const out: BranchRow<string>[] = [];
	const walk = (list: readonly TreeNode[], depth: number): void => {
		for (const node of list) {
			const children = node.children ?? [];
			out.push({ id: node.id, depth, hasChildren: children.length > 0 });
			walk(children, depth + 1);
		}
	};
	walk(nodes, 0);
	return out;
};

/**
 * The branch a fold gesture on `id` acts on — the foldable ids in it, the
 * outermost first.
 *
 * ONLY THE LEVEL IT IS COLLAPSING ([HUMAN] Sam 2026-09-06). The gesture used
 * to take the whole tree, which is a blunt answer to the thing it is actually
 * for: shutting the branch you are done reading without losing your place
 * anywhere else. Siblings and ancestors are left exactly as they were.
 *
 * A row WITH children is its own branch: it folds, and so does everything
 * foldable beneath it, so re-opening it shows one clean level rather than the
 * thicket you left. A LEAF has nothing to fold, so it stands for the branch it
 * sits in — its parent — which is what makes the gesture answer on any row
 * rather than only on the ones wearing a twisty. A top-level leaf has no
 * branch, and nothing happens.
 *
 * WHICH WAY it goes is `foldAll`, as before: hand it this list and it says
 * which of them end up shut, so the same gesture unfolds what it folded.
 */
export const foldBranch = <T>(rows: readonly BranchRow<T>[], id: T): T[] => {
	const at = rows.findIndex((row) => row.id === id);
	if (at < 0) {
		return [];
	}
	let root = at;
	if (!rows[at]!.hasChildren) {
		root = -1;
		for (let cursor = at - 1; cursor >= 0; cursor -= 1) {
			if (rows[cursor]!.depth < rows[at]!.depth) {
				root = cursor;
				break;
			}
		}
		if (root < 0) {
			return [];
		}
	}
	const rootDepth = rows[root]!.depth;
	const branch: T[] = [rows[root]!.id];
	for (let cursor = root + 1; cursor < rows.length; cursor += 1) {
		const row = rows[cursor]!;
		if (row.depth <= rootDepth) {
			break;
		}
		if (row.hasChildren) {
			branch.push(row.id);
		}
	}
	return branch;
};

export const descendantIds = (node: TreeNode): string[] => {
	const out: string[] = [];
	for (const child of node.children ?? []) {
		out.push(child.id, ...descendantIds(child));
	}
	return out;
};

/* The leaves under a node, which is what a parent's own state is a summary
   of. A parent with no leaves is its own leaf. */
export const leafIds = (node: TreeNode): string[] => {
	if (!node.children || node.children.length === 0) {
		return [node.id];
	}
	return node.children.flatMap(leafIds);
};

export type MarkState = "on" | "off" | "mixed";

/* A parent says "some of mine" only while that is true. Recomputed from the
   leaves rather than stored, so no gesture can leave it lying. */
export const markState = (node: TreeNode, marked: ReadonlySet<string>): MarkState => {
	const leaves = leafIds(node);
	const on = leaves.filter((id) => marked.has(id)).length;
	if (on === 0) {
		return "off";
	}
	return on === leaves.length ? "on" : "mixed";
};

export const markCount = (node: TreeNode, marked: ReadonlySet<string>): string => {
	const leaves = leafIds(node);
	return `${leaves.filter((id) => marked.has(id)).length}/${leaves.length}`;
};

/* Setting a node sets everything under it. A swipe sets every entry it
   crosses to the SAME state the first one took, never flipping each — a
   swipe that alternated would be a random number generator — so `on` is
   decided once by the caller and passed in for every row after. */
export const setMark = (marked: ReadonlySet<string>, node: TreeNode, on: boolean): Set<string> => {
	const next = new Set(marked);
	for (const id of leafIds(node)) {
		if (on) {
			next.add(id);
		} else {
			next.delete(id);
		}
	}
	return next;
};

/* Which side of a row a drop lands on. Height-aware: the half of the row the
   pointer is in decides, and it is the only way to reach the END of a list,
   where there is no next row to go before. */
export const dropSide = (pointerY: number, box: { top: number; height: number }): "before" | "after" =>
	pointerY > box.top + box.height / 2 ? "after" : "before";

/* Reorder within one parent's list. A drop on itself, or across parents, is
   a no-op — the same guard the DOM version got from `parentElement` equality
   and the reason a drag out of a subtree cannot silently reparent. */
export const moveNode = (list: TreeNode[], dragId: string, targetId: string, side: "before" | "after"): TreeNode[] => {
	const from = list.findIndex((node) => node.id === dragId);
	const at = list.findIndex((node) => node.id === targetId);
	if (from < 0 || at < 0 || dragId === targetId) {
		return list;
	}
	const next = [...list];
	const [moved] = next.splice(from, 1);
	if (!moved) {
		return list;
	}
	const target = next.findIndex((node) => node.id === targetId);
	next.splice(side === "after" ? target + 1 : target, 0, moved);
	return next;
};

/* Keyboard movement over the visible rows. Returns the id to select, or
   undefined for a key the tree does not answer. */
export const rowForKey = (rows: TreeRow[], currentId: string | undefined, key: string): string | undefined => {
	if (rows.length === 0) {
		return undefined;
	}
	const at = rows.findIndex((row) => row.node.id === currentId);
	if (key === "Home") {
		return rows[0]?.node.id;
	}
	if (key === "End") {
		return rows[rows.length - 1]?.node.id;
	}
	if (key === "ArrowDown" && at < rows.length - 1) {
		return rows[at + 1]?.node.id;
	}
	if (key === "ArrowUp" && at > 0) {
		return rows[at - 1]?.node.id;
	}
	return undefined;
};
