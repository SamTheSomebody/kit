<script lang="ts">
	import type { Snippet } from "svelte";

	import "./empty.css";

	/* A pane with nothing in it is the first thing a new tool shows, and
	   every tool was improvising it. Lifted from `.dock-empty`, sentence and
	   all: centred, muted, on the stage ground, and it may carry one key. */
	let { text, action }: { text: string; action?: Snippet } = $props();
</script>

<div class="kit-empty">
	<span>{text}</span>
	{#if action}{@render action()}{/if}
</div>
