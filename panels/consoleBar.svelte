<script lang="ts">
	import type { Snippet } from "svelte";

	import { LOG_LEVELS, type LogLevel } from "@samthesomebody/kit/terminal/log.ts";
	import ConsoleKey from "./consoleKey.svelte";
	import { getConsoleContext } from "./console.svelte";

	/* Clear, filter, levels: the controls a console bar has, in the order
	   every console puts them, then Collapse and whatever the tool adds. Each
	   level key carries its count, so the filter and the "how bad is it"
	   readout are one control. It wraps in a narrow pane rather than losing
	   the levels off the edge. */
	let {
		levels = LOG_LEVELS,
		collapse = true,
		actions,
	}: {
		/** The level keys to draw. */
		levels?: readonly LogLevel[];
		/** Offer Collapse: every identical line folded into one. */
		collapse?: boolean;
		/** The tool's own keys (`ConsoleKey`), after the console's. */
		actions?: Snippet;
	} = $props();

	const context = getConsoleContext();
</script>

<div class="log-bar">
	{#if context.clear}
		<button type="button" class="log-clear" title="Clear the console" aria-label="Clear the console" onclick={context.clear}
			>⃠</button
		>
	{/if}
	<input
		type="search"
		class="log-filter"
		placeholder="Filter"
		aria-label="Filter console output"
		bind:value={context.view.text}
	/>
	<div class="log-levels">
		{#each levels as level (level)}
			{@const count = context.counts[level]}
			<ConsoleKey
				label="{level} {count}"
				{level}
				pressed={context.view.levels.has(level)}
				quiet={count === 0}
				tip={context.view.levels.has(level) ? `Hide ${level} lines` : `Show ${level} lines`}
				onclick={() => context.view.toggle(level)}
			/>
		{/each}
		{#if collapse}
			<ConsoleKey
				label="collapse"
				pressed={context.view.collapse}
				tip="One line per repeated message"
				onclick={() => (context.view.collapse = !context.view.collapse)}
			/>
		{/if}
		{@render actions?.()}
	</div>
	{#if !context.pinned}
		<button type="button" class="log-jump" title="Scroll to the newest line and follow it again" onclick={context.jump}
			>↓ latest</button
		>
	{/if}
</div>
