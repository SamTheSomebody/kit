<script lang="ts">
	import type { Snippet } from "svelte";

	import Icon from "./icon.svelte";

	import "./controls.css";
	import "./filterRow.css";

	/* A FILTER THAT IS THE LIST'S FIRST ROW. A Field above a tree is a
	   control of its own, 28px tall in its own padded box, and reads as
	   floating over the list it filters. This is a row of that list instead:
	   a tree row's height, the pane's full width, its glyph on the twisty
	   column and its count on the type column, so typed text starts where the
	   labels do. Put it straight in a `Pane`, above the `Container` the list
	   scrolls in. Escape clears it. */
	let {
		value = $bindable(""),
		placeholder = "Filter",
		count,
		trailing,
	}: {
		value?: string;
		placeholder?: string;
		/** What the filter leaves, e.g. `4/19`; shown at the end, muted. */
		count?: string;
		/** The list's own keys, after the count. */
		trailing?: Snippet;
	} = $props();
</script>

<label class="kit-filter-row">
	<span class="kit-filter-row-glyph" aria-hidden="true"><Icon name="search" /></span>
	<input
		type="search"
		{placeholder}
		aria-label={placeholder}
		bind:value
		onkeydown={(event) => {
			if (event.key === "Escape" && value !== "") {
				event.preventDefault();
				value = "";
			}
		}}
	/>
	{#if count !== undefined}<span class="kit-filter-row-count">{count}</span>{/if}
	{@render trailing?.()}
</label>
