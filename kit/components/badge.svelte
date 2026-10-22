<script lang="ts">
	import type { Snippet } from "svelte";

	import "./badge.css";

	/* A READOUT, not a control: no hover, no focus, no disabled of its own —
	   it dims with the row it sits in. Tone is the axis instead of state. For
	   a bare severity marker use the tab's status light; a badge carries a
	   VALUE with a word or a count on it. */
	let {
		text,
		tone = "default",
		disabled = false,
		children,
	}: {
		text?: string;
		tone?: "default" | "ok" | "warn" | "danger" | "busy";
		disabled?: boolean;
		children?: Snippet;
	} = $props();
</script>

<span class="kit-badge" class:disabled data-tone={tone === "default" ? undefined : tone}>
	{#if children}{@render children()}{:else}{text}{/if}
</span>
