<script lang="ts">
	import type { Snippet } from "svelte";

	import "./section.css";

	/* A NAMED LINE BREAK, and the replacement for every card in the estate.

	   A card enclosed its content — four borders, a radius and a padding — so
	   three groups down a pane meant crossing six edges and four paddings to
	   read them. A section separates instead: one hairline under a caption,
	   no box, no padding of its own. It is the field's own device, where a
	   rule under a line of type IS the control.

	   Where the content is a THING rather than a grouping — a log, a queue, a
	   corpus readout — it should be a dock tab, not a section. The dock draws
	   those, and a tab costs no pixels until it is asked for. */
	let {
		title,
		children,
	}: {
		/** Omit for a bare rule: a line break that says nothing more. */
		title?: string;
		children: Snippet;
	} = $props();
</script>

<section class="kit-section" class:bare={title === undefined}>
	{#if title}<span class="kit-section-title">{title}</span>{/if}
	<div class="kit-section-body">{@render children()}</div>
</section>
