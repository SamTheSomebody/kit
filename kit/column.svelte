<script lang="ts">
	import type { LayoutPlace, LayoutRecipe, LayoutSize } from "./types.ts";

	import "./layout.css";
	import type { Snippet } from "svelte";

	let {
		children,
		recipe,
		place,
		size,
	}: {
		children: Snippet;
		recipe?: LayoutRecipe;
		place?: LayoutPlace;
		size?: LayoutSize;
	} = $props();

	const fillPercent = $derived(typeof size === "string" ? /^fill\(([1-9][0-9]?|100)%\)$/.exec(size) : null);
	const resolvedPlace = $derived(place ?? (recipe === "fields" ? "center" : undefined));
</script>

<div
	class="kit-column"
	data-recipe={recipe}
	data-place={resolvedPlace}
	data-size={size}
	style:width={fillPercent ? `${fillPercent[1]}%` : undefined}
>
	{@render children()}
</div>
