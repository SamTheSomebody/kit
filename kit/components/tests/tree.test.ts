import { describe, expect, it } from "vitest";

import { ancestorIds, branchIds, filterTree, nodeCount, type TreeNode } from "../tree.ts";

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
