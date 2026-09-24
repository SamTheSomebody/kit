<script lang="ts">
	import {
		type IconName,
		branchRows,
		crossedTo,
		dropSide,
		foldAll,
		foldBranch,
		foldsBranch,
		markCount,
		markState,
		moveNode,
		treeRowForKey,
		setMark,
		stroke,
		visibleRows,
		type TreeNode,
	} from "./index.ts";

	import Checkbox from "./checkbox.svelte";
	import IconButton from "./iconButton.svelte";

	import "./tree.css";
	import "./checkbox.css";

	/* THE TREE DEFAULTS TO NO CHECKBOX. The eye is the visibility mark and
	   the accent bar is selection; `select` adds checkboxes only for picking
	   a nested SET, which is the one job an eye cannot do.

	   SWIPE TO TOGGLE. Press a row's eye and drag: every entry the pointer
	   crosses is set to the SAME state the first one took, never flipped
	   individually — a swipe that alternated would be a random number
	   generator. The gesture is `IconButton`'s, through its `ontoggle` seam:
	   it belongs to the TOGGLE (`controls/paint.ts`) rather than to this
	   component, so the estate's other trees have it too. This tree only
	   widens the target — the whole ROW answers for its eye while a stroke is
	   in flight, so a swipe need not stay inside a 12px column.

	   Hit-testing, not pointer capture: the pointer spends the whole gesture
	   over rows the press did not start on, and capture would send every
	   move to the row it began in.

	   THE TWISTY IS CHECKED BEFORE ROW SELECTION. It lives inside a row, so
	   a row-first test swallows every expand — which is exactly what killed
	   the plain tree's twisty during the design. */
	let {
		nodes = $bindable(),
		expanded = $bindable(new Set<string>()),
		marked = $bindable(new Set<string>()),
		selected = $bindable<string | undefined>(undefined),
		select = false,
		reorder = false,
		mark = "visible",
		disabled = false,
		onmark,
		onreorder,
	}: {
		nodes: TreeNode[];
		expanded?: Set<string>;
		/* what the eye or the checkbox has picked out, by leaf id */
		marked?: Set<string>;
		selected?: string;
		/* the multi-select form: checkboxes and a count per parent */
		select?: boolean;
		reorder?: boolean;
		/* which icon carries the mark in the plain form */
		mark?: IconName;
		disabled?: boolean;
		onmark?: (marked: Set<string>) => void;
		onreorder?: (nodes: TreeNode[]) => void;
	} = $props();

	const rows = $derived(visibleRows(nodes, expanded));

	const toggleTwist = (id: string): void => {
		const next = new Set(expanded);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		expanded = next;
	};

	/**
	 * One BRANCH, folded or unfolded — cmd/ctrl/alt with a click, or the middle
	 * button. `foldBranch` picks the ids (the row's own subtree, or the one it
	 * sits in when it is a leaf) and `foldAll` decides which way; both are
	 * rules, so this tree and the game shells' plain-DOM inspector cannot drift
	 * apart on the gesture. What is local is only which set this component
	 * happens to keep (`expanded`, since its rows default closed) — and it is
	 * written for the branch alone, so the rest of the tree keeps its shape.
	 */
	const foldTheBranch = (id: string): void => {
		const branch = foldBranch(branchRows(nodes), id);
		if (branch.length === 0) {
			return;
		}
		const shut = new Set(foldAll(branch, (candidate) => expanded.has(candidate)));
		const next = new Set(expanded);
		for (const candidate of branch) {
			if (shut.has(candidate)) {
				next.delete(candidate);
			} else {
				next.add(candidate);
			}
		}
		expanded = next;
	};

	/* ── the mark ─────────────────────────────────────────────────────── */
	const paint = (node: TreeNode, on: boolean): void => {
		marked = setMark(marked, node, on);
		onmark?.(marked);
	};

	/* The row standing in for its own eye. `crossedTo` is the toggle
	   gesture's rule and the stroke is the toggle's, so a swipe that started
	   on any eye in the estate paints this row — there is no second latch
	   here to fall out of step with the first. */
	const crossPaint = (node: TreeNode): void => {
		if (disabled || node.disabled) {
			return;
		}
		const on = crossedTo(stroke(), markState(node, marked) === "on");
		if (on !== undefined) {
			paint(node, on);
		}
	};

	/* ── reorder ─────────────────────────────────────────────────────── */
	let drag = $state<{ id: string; parentId?: string } | undefined>();
	let dropAt = $state<{ id: string; side: "before" | "after" } | undefined>();

	const startDrag = (id: string, parentId: string | undefined, event: PointerEvent): void => {
		drag = { id, parentId };
		document.body.classList.add("reordering");
		event.preventDefault();
	};

	const overRow = (id: string, parentId: string | undefined, event: PointerEvent): void => {
		if (!drag || id === drag.id || parentId !== drag.parentId) {
			return;
		}
		const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
		dropAt = { id, side: dropSide(event.clientY, box) };
	};

	const endDrag = (): void => {
		if (drag && dropAt) {
			const parentId = drag.parentId;
			const apply = (list: TreeNode[]): TreeNode[] =>
				list.map((node) =>
					node.children
						? {
								...node,
								children:
									node.id === parentId
										? moveNode(node.children, drag!.id, dropAt!.id, dropAt!.side)
										: apply(node.children),
							}
						: node,
				);
			nodes = parentId === undefined ? moveNode(nodes, drag.id, dropAt.id, dropAt.side) : apply(nodes);
			onreorder?.(nodes);
		}
		drag = undefined;
		dropAt = undefined;
		document.body.classList.remove("reordering");
	};

	const onKey = (event: KeyboardEvent): void => {
		const next = treeRowForKey(rows, selected, event.key);
		if (next !== undefined) {
			event.preventDefault();
			selected = next;
			return;
		}
		const row = rows.find((candidate) => candidate.node.id === selected);
		if (!row) {
			return;
		}
		if (event.key === "ArrowRight" && !row.leaf && !expanded.has(row.node.id)) {
			event.preventDefault();
			toggleTwist(row.node.id);
		} else if (event.key === "ArrowLeft" && !row.leaf && expanded.has(row.node.id)) {
			event.preventDefault();
			toggleTwist(row.node.id);
		} else if (event.key === " ") {
			event.preventDefault();
			paint(row.node, markState(row.node, marked) !== "on");
		}
	};
</script>

<svelte:window onpointerup={endDrag} />

<div class="kit-tree" class:select role="tree" tabindex="-1" onkeydown={onKey}>
	{#each rows as row (row.node.id)}
		<div
			class="kit-tree-row"
			class:on={selected === row.node.id}
			class:off={!select && markState(row.node, marked) === "off"}
			class:disabled={disabled || row.node.disabled}
			class:dragging={drag?.id === row.node.id}
			class:dropmark={dropAt?.id === row.node.id && dropAt.side === "before"}
			class:dropmark-after={dropAt?.id === row.node.id && dropAt.side === "after"}
			style="--kit-tree-depth: {row.depth}"
			role="treeitem"
			aria-selected={selected === row.node.id}
			aria-expanded={row.leaf ? undefined : expanded.has(row.node.id)}
			tabindex={selected === row.node.id ? 0 : -1}
			onpointermove={(event) => {
				crossPaint(row.node);
				overRow(row.node.id, row.parentId, event);
			}}
			onclick={(event) => {
				/* A modified click is the BRANCH gesture and not a selection:
				   changing what is selected on the way past would be a second
				   thing nobody asked for. Checked before the button/label guard
				   so it works over the twisty and the eye too. */
				if (foldsBranch(event)) {
					event.preventDefault();
					foldTheBranch(row.node.id);
					return;
				}
				/* order matters: the twisty and the marks are inside the row */
				if ((event.target as HTMLElement).closest("button, label")) return;
				selected = row.node.id;
			}}
			onauxclick={(event) => {
				/* Middle click anywhere on a ROW rather than only on the caret —
				   the twisty is 12px wide and a row is the whole line. It folds
				   the row's BRANCH, which is the thing a leaf could not say for
				   itself: it has no twisty of its own to press. */
				if (event.button !== 1) return;
				event.preventDefault();
				foldTheBranch(row.node.id);
			}}
			onmousedown={(event) => event.button === 1 && event.preventDefault()}
			onkeydown={(event) => {
				if (event.key !== "Enter") return;
				selected = row.node.id;
			}}
		>
			{#if reorder}
				<IconButton
					class="kit-tree-grip"
					name="drag"
					label="Reorder {row.node.label}"
					tip={false}
					onpointerdown={(event) => startDrag(row.node.id, row.parentId, event)}
				/>
			{:else}
				<button
					type="button"
					class="kit-tree-twist"
					class:leaf={row.leaf}
					aria-expanded={row.leaf ? undefined : expanded.has(row.node.id)}
					aria-label={row.leaf ? "" : "Expand {row.node.label}"}
					tabindex={-1}
					onclick={() => !row.leaf && toggleTwist(row.node.id)}>▾</button
				>
			{/if}

			{#if select}
				<Checkbox
					label={row.node.label}
					checked={markState(row.node, marked) === "on"}
					mixed={markState(row.node, marked) === "mixed"}
					disabled={disabled || row.node.disabled}
					onchange={(on) => paint(row.node, on)}
				/>
				{#if !row.leaf}
					<span class="kit-tree-count">{markCount(row.node, marked)}</span>
				{/if}
			{:else}
				<span class="kit-tree-label">{row.node.label}</span>
				<IconButton
					class="kit-tree-eye"
					name={mark}
					label={row.node.label}
					pressed={markState(row.node, marked) === "on"}
					disabled={disabled || row.node.disabled}
					tip={false}
					ontoggle={(on) => paint(row.node, on)}
				/>
			{/if}
		</div>
	{/each}
</div>
