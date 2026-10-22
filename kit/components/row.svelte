<script lang="ts">
	import type { Snippet } from "svelte";

	import "./controls.css";
	import "./label.css";

	/* Shell Row = layout Row with recipe `toolbar` (design lock). Classes only —
	   `layout.css` rides in via `ui` / `kit`; components must not import `kit`. */
	let { children, caption }: { children: Snippet; caption?: string } = $props();
</script>

{#if caption}
	<div class="kit-row" data-recipe="stack" data-place="pack">
		<span class="kit-label">{caption}</span>
		<div class="kit-row" data-recipe="toolbar" data-place="center">{@render children()}</div>
	</div>
{:else}
	<div class="kit-row" data-recipe="toolbar" data-place="center">{@render children()}</div>
{/if}
