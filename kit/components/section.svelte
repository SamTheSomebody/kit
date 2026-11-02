<script lang="ts">
	import type { Snippet } from "svelte";

	import Icon from "./icon.svelte";

	import "./controls.css";
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
		/** Set to make it fold: the header becomes the toggle, twisty first. Needs `title`. */
		open?: boolean;
		children: Snippet;
	} = $props();

	const folds = $derived(title !== undefined && title !== "" && open !== undefined);

	const toggle = (): void => {
		open = !open;
	};

	/* A FOLDING HEADER IS ONE TARGET: the twisty sits first, where a tree's
	   does, and a press anywhere on the line (caption, rule, a badge) folds
	   it. A control in the status keeps its own click. The keyboard reaches
	   the fold through the toggle button; this only widens the pointer's. */
	const pressHeader = (event: MouseEvent): void => {
		const target = event.target;
		if (target instanceof Element && target.closest("button, a, input, select, textarea, [role='button']") !== null) {
			return;
		}
		toggle();
	};
</script>

<section class="kit-section" class:bare={title === undefined}>
	{#if title && folds}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div class="kit-section-title folds" onclick={pressHeader}>
			<button type="button" class="kit-section-toggle" aria-expanded={open} onclick={toggle}
				><span class="kit-section-twisty"><Icon name="collapse" /></span>{title}</button
			>
			{#if status}<span class="kit-section-status">{@render status()}</span>{/if}
		</div>
	{:else if title}
		<span class="kit-section-title">
			{title}
			{#if status}<span class="kit-section-status">{@render status()}</span>{/if}
		</span>
	{/if}
	{#if !folds || open}
		<div class="kit-section-body">{@render children()}</div>
	{/if}
</section>
