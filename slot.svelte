<script lang="ts">
	import type { LayoutSize } from "./types.ts";

	import "./layout.css";
	import type { Snippet } from "svelte";

	let {
		children,
		size = "fit",
	}: {
		children: Snippet;
		size?: LayoutSize;
	} = $props();

	const fillPercent = $derived(typeof size === "string" ? /^fill\(([1-9][0-9]?|100)%\)$/.exec(size) : null);
</script>

<div
	class="kit-slot"
	data-size={size}
	style:width={fillPercent ? `${fillPercent[1]}%` : undefined}
	style:flex={fillPercent ? "0 0 auto" : undefined}
>
	{@render children()}
</div>
