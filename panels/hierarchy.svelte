<script lang="ts">
	import { untrack, type Snippet } from "svelte";

	import Container from "@samthesomebody/kit/container.svelte";
	import Slot from "@samthesomebody/kit/slot.svelte";
	import Empty from "@samthesomebody/kit/components/empty.svelte";
	import Field from "@samthesomebody/kit/components/field.svelte";
	import Label from "@samthesomebody/kit/components/label.svelte";
	import Pane from "@samthesomebody/kit/components/pane.svelte";
	import Row from "@samthesomebody/kit/components/row.svelte";
	import Tree from "@samthesomebody/kit/components/tree.svelte";
	import { ancestorIds, branchIds, filterTree, nodeCount, type TreeNode } from "@samthesomebody/kit/components/tree.ts";

	/* THE HIERARCHY: a filter over a tree, as every scene panel draws one.
	   The rows are `Tree`'s (label, note, badges, kind, trailing, eye) and
	   the behaviour is the part each tool used to rebuild:
	   - the filter matches the label, kind and note, and keeps the branches
	     above a match so it is read in place; the count says how many show
	   - a selection made elsewhere (the canvas, a link) opens the branches
	     above it
	   - what is open is remembered per `persist` key, across reloads; until
	     then the top level starts open */
	let {
		nodes,
		selected = $bindable<string | undefined>(undefined),
		marked = $bindable(new Set<string>()),
		eye = false,
		persist,
		placeholder = "Filter",
		empty = "Nothing here",
		onmark,
		trailing,
		actions,
	}: {
		nodes: TreeNode[];
		selected?: string;
		/* the eye's marks, as `Tree` keeps them */
		marked?: Set<string>;
		eye?: boolean;
		/* the localStorage key open branches are kept under */
		persist?: string;
		placeholder?: string;
		/* what an empty tree says */
		empty?: string;
		onmark?: (marked: Set<string>) => void;
		trailing?: Snippet<[TreeNode]>;
		/* the tool's own controls, after the filter */
		actions?: Snippet;
	} = $props();

	const storageKey = (): string | undefined => (persist === undefined ? undefined : `kit-hierarchy:${persist}`);

	const load = (key: string | undefined): Set<string> | undefined => {
		if (key === undefined) return undefined;
		try {
			const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
			return Array.isArray(parsed) ? new Set(parsed.filter((id): id is string => typeof id === "string")) : undefined;
		} catch {
			return undefined;
		}
	};

	const save = (key: string | undefined, open: Set<string>): void => {
		if (key === undefined) return;
		try {
			localStorage.setItem(key, JSON.stringify([...open]));
		} catch {
			// No storage (a private window): the open branches last for the page.
		}
	};

	let query = $state("");
	const needle = $derived(query.trim().toLowerCase());
	const shown = $derived(filterTree(nodes, needle));

	/* What is open belongs to one `persist` key: a new key loads its own
	   folds before anything saves, so one scene's folds never land under
	   another's. Nothing saved yet ("seeded" false) opens the top level once
	   there are nodes; only then is there anything worth saving. */
	let loadedKey = storageKey();
	const initial = load(loadedKey);
	let open = $state<Set<string>>(initial ?? new Set());
	let seeded = $state(initial !== undefined);

	$effect.pre(() => {
		const key = storageKey();
		if (key === loadedKey) return;
		loadedKey = key;
		const saved = load(key);
		open = saved ?? new Set();
		seeded = saved !== undefined;
	});

	$effect(() => {
		if (seeded || nodes.length === 0) return;
		seeded = true;
		open = new Set(nodes.filter((node) => (node.children?.length ?? 0) > 0).map((node) => node.id));
	});

	/* A filtered tree is read fully open; the reader's own folds come back
	   when the filter clears, untouched. */
	const expanded = $derived(needle === "" ? open : new Set(branchIds(shown)));

	/* A new selection opens the branches above it, once: folding one of them
	   afterwards stays folded, and edits that rebuild `nodes` don't reopen it.
	   A selection not in the tree yet is retried when the nodes arrive. */
	let revealed: string | undefined;
	$effect(() => {
		if (selected === undefined) {
			revealed = undefined;
			return;
		}
		if (selected === revealed) return;
		const ancestors = ancestorIds(nodes, selected);
		if (ancestors === undefined) return;
		revealed = selected;
		untrack(() => {
			const shut = ancestors.filter((id) => !open.has(id));
			if (shut.length > 0) open = new Set([...open, ...shut]);
		});
	});

	$effect(() => {
		if (seeded) save(storageKey(), open);
	});
</script>

<Pane fill>
	<Container size="fit">
		<Row>
			<Slot size="fill">
				<Field type="search" {placeholder} bind:value={query} />
			</Slot>
			{#if needle !== ""}
				<Label text="{nodeCount(shown)}/{nodeCount(nodes)}" />
			{/if}
			{@render actions?.()}
		</Row>
	</Container>
	<Container size="fill">
		{#if shown.length === 0}
			<Empty text={needle === "" ? empty : "Nothing matches the filter"} />
		{:else}
			<Tree
				nodes={shown}
				bind:expanded={() => expanded, (next) => needle === "" && (open = next)}
				bind:selected
				bind:marked
				{eye}
				{onmark}
				{trailing}
			/>
		{/if}
	</Container>
</Pane>
