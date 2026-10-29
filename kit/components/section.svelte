<script lang="ts">
	import type { Snippet } from "svelte";

	import IconButton from "./iconButton.svelte";

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
		status,
		open = $bindable(),
		children,
	}: {
		/** Omit for a bare rule: a line break that says nothing more. */
		title?: string;
		/** Status badges for the whole section, at the right end of the title rule. Needs `title`. */
		status?: Snippet;
		/** Set to make it fold: a twisty after the status closes the body. Needs `title`. */
		open?: boolean;
		children: Snippet;
	} = $props();

	const folds = $derived(title !== undefined && title !== "" && open !== undefined);
</script>

<section class="kit-section" class:bare={title === undefined}>
	{#if title}
		<span class="kit-section-title">
			{title}
			{#if status || folds}<span class="kit-section-status"
					>{@render status?.()}{#if folds}<IconButton
							name="collapse"
							label={open ? "Fold" : "Unfold"}
							expanded={open}
							onclick={() => (open = !open)}
						/>{/if}</span
				>{/if}
		</span>
	{/if}
	{#if !folds || open}
		<div class="kit-section-body">{@render children()}</div>
	{/if}
</section>
