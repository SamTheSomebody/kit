<script lang="ts">
	import type { Snippet } from "svelte";

	import "./layout.css";

	let {
		children,
		cols = 2,
	}: {
		children: Snippet;
		cols?: 1 | 2 | 3;
	} = $props();
</script>

<div class="kit-columns" data-cols={cols === 2 ? undefined : String(cols)}>
	{@render children()}
</div>
