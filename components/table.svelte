<script lang="ts">
	import { nextSort, type SortState } from "./index.ts";

	import "./table.css";

	/* THE TABLE ROW IS THE TREE ROW IS THE MENU ROW: one 16px object (2px of
	   block padding, 5px inline, the same 12px caption), three kinds of
	   content, one primitive — which is why a table needs no new state
	   machine. It was 22px until [HUMAN] Sam took all three down together on
	   2026-09-07; each row keeps its own GAP, which is a column rhythm and
	   not a height (7px here, 5px in a menu, 2px in a tree).

	   One sorted column per table, and clicking the sorted one turns it
	   around. The rows are the CONSUMER's data and are not reordered here;
	   `sortRows` in `sort.ts` is offered, not imposed. */
	let {
		columns,
		rows,
		sort = $bindable<SortState>(undefined),
		selected = $bindable<string | undefined>(undefined),
		onsort,
	}: {
		columns: { key: string; label: string; numeric?: boolean; sortable?: boolean }[];
		rows: { id: string; cells: Record<string, string>; disabled?: boolean }[];
		sort?: SortState;
		selected?: string;
		onsort?: (sort: SortState) => void;
	} = $props();

	const turn = (column: string): void => {
		sort = nextSort(sort, column);
		onsort?.(sort);
	};

	/* THE TRACK LIST COMES FROM THE COLUMNS. `table.css` used to nail it to
	   `1fr max-content`, which is the artifact's two-column table and silently
	   wrong for any other — grid put the surplus cells on implicit rows, so a
	   six-column table drew three stacked lines per record. A figures column
	   takes exactly its digits; every other column shares the slack and
	   ellipsises when there is none. Two columns resolve to the old value, so
	   the drawn form of every table that shipped is unchanged. */
	const tracks = $derived(columns.map((column) => (column.numeric ? "max-content" : "minmax(0, 1fr)")).join(" "));
</script>

<div class="kit-table" role="table" style="--kit-table-columns: {tracks}">
	<div class="kit-table-row kit-table-head" role="row">
		{#each columns as column (column.key)}
			{#if column.sortable}
				<button
					type="button"
					class="kit-table-sort"
					class:kit-table-num={column.numeric}
					role="columnheader"
					aria-sort={sort?.column === column.key ? sort.direction : undefined}
					onclick={() => turn(column.key)}
				>
					{column.label}<i aria-hidden="true">▾</i>
				</button>
			{:else}
				<span class:kit-table-num={column.numeric}>{column.label}</span>
			{/if}
		{/each}
	</div>
	{#each rows as row (row.id)}
		<div
			class="kit-table-row"
			class:on={selected === row.id}
			class:disabled={row.disabled}
			role="row"
			tabindex={selected === row.id ? 0 : -1}
			onclick={() => (selected = row.id)}
			onkeydown={(event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				selected = row.id;
			}}
		>
			{#each columns as column (column.key)}
				<!-- the `title` is what an ellipsised cell gives back -->
				<span class:kit-table-num={column.numeric} title={row.cells[column.key] ?? ""}
					>{row.cells[column.key] ?? ""}</span
				>
			{/each}
		</div>
	{/each}
</div>
