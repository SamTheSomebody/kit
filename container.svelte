<script lang="ts">
	import type { LayoutSize } from "./types.ts";

	import "./layout.css";
	import type { Snippet } from "svelte";

	let {
		children,
		size = "fill",
		pad = "dock",
	}: {
		children: Snippet;
		size?: LayoutSize;
		pad?: 0 | "dock";
	} = $props();
</script>

<div class="kit-container" data-size={size} data-pad={pad === 0 ? "0" : undefined}>
	{@render children()}
</div>
