<script lang="ts">
	import type { Snippet } from "svelte";

	import "./pane.css";

	/* Pane = Container fill alias (layout kit). `fill` = pad 0 / gap 0 / overflow hidden. */
	let {
		children,
		fill = false,
	}: {
		children: Snippet;
		fill?: boolean;
	} = $props();
</script>

<div class="kit-pane kit-container" class:fill data-size="fill" data-pad={fill ? "0" : undefined}>
	{@render children()}
</div>
