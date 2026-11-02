import { describe, expect, it } from "vitest";

import { ancestorIds, branchIds, filterTree, nodeCount, toggleSolo, type TreeNode } from "../tree.ts";

const tree: TreeNode[] = [
	{ id: "a", label: "board", kind: "container", children: [{ id: "a1", label: "reel", note: "› content" }] },
	{ id: "b", label: "vignette", kind: "sprite" },
];

describe("filterTree", () => {
	it("keeps a match with the branches above it", () => {
		expect(filterTree(tree, "content")).toEqual([
			{ ...tree[0], children: [{ id: "a1", label: "reel", note: "› content" }] },
		]);
	});

	it("matches the kind as well as the label", () => {
		expect(filterTree(tree, "SPRITE").map((node) => node.id)).toEqual(["b"]);
	});

	it("is the whole tree for an empty needle", () => {
		expect(filterTree(tree, "  ")).toEqual(tree);
	});
});

describe("ancestorIds", () => {
	it("lists the branches above a node, outermost first", () => {
		expect(ancestorIds(tree, "a1")).toEqual(["a"]);
		expect(ancestorIds(tree, "b")).toEqual([]);
		expect(ancestorIds(tree, "missing")).toBeUndefined();
	});
});

describe("branchIds and nodeCount", () => {
	it("count every depth", () => {
		expect(branchIds(tree)).toEqual(["a"]);
		expect(nodeCount(tree)).toBe(3);
	});
});

describe("toggleSolo", () => {
	const tree: TreeNode = {
		id: "root",
		label: "root",
		children: [
			{ id: "a", label: "a", children: [{ id: "a1", label: "a1" }, { id: "a2", label: "a2" }] },
			{ id: "b", label: "b" },
			{ id: "c", label: "c" },
		],
	};
	const [a, b] = tree.children ?? [];
	if (a === undefined || b === undefined) throw new Error("fixture has children");
	const all = new Set(["a1", "a2", "b", "c"]);

	it("leaves only the node's leaves on, and unsolos back to what was on", () => {
		const first = toggleSolo(new Set(["a1", "b"]), a, undefined);
		expect([...first.marked].sort()).toEqual(["a1", "a2"]);
		const back = toggleSolo(first.marked, a, first.solo);
		expect([...back.marked].sort()).toEqual(["a1", "b"]);
		expect(back.solo).toBeUndefined();
	});

	it("soloing another node straight after keeps the original marks to go back to", () => {
		const first = toggleSolo(all, a, undefined);
		const second = toggleSolo(first.marked, b, first.solo);
		expect([...second.marked]).toEqual(["b"]);
		expect([...toggleSolo(second.marked, b, second.solo).marked].sort()).toEqual([...all].sort());
	});

	it("an edit to the marks ends the solo where it stands", () => {
		const first = toggleSolo(all, b, undefined);
		const edited = new Set([...first.marked, "c"]);
		const again = toggleSolo(edited, b, first.solo);
		expect([...again.marked]).toEqual(["b"]);
		expect([...again.solo?.before ?? []].sort()).toEqual(["b", "c"]);
	});
});
