<script lang="ts">
	import type { LayoutPlace, LayoutRecipe } from "./types.ts";

	import "./layout.css";
	import type { Snippet } from "svelte";

	let {
		children,
		recipe,
		place,
		wrap,
	}: {
		children: Snippet;
		recipe?: LayoutRecipe;
		place?: LayoutPlace;
		wrap?: "wrap" | "nowrap";
	} = $props();

	/* Silent Row under a fields Column must not invent recipe=stack (contents
	   grid). Toolbar/fields without place inherit recipe default place. */
	const resolvedPlace = $derived(
		place ?? (recipe === "fields" || recipe === "toolbar" ? "center" : recipe === "stack" ? "pack" : undefined),
	);
</script>

<div class="kit-row" data-recipe={recipe} data-place={resolvedPlace} data-wrap={wrap}>
	{@render children()}
</div>
