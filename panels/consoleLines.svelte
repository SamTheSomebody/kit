<script lang="ts">
	import { matchTerminalLinks } from "@samthesomebody/kit/terminal/links.ts";
	import { entryKey, isPinnedToBottom, type LogEntry } from "@samthesomebody/kit/terminal/log.ts";
	import type { TerminalLinkTarget } from "@samthesomebody/kit/terminal/types.ts";
	import { getConsoleContext } from "./console.svelte";

	/* The lines, as the log pane draws them: oldest first, the clock in a
	   fixed column, the message in its level's colour, the repeat count and
	   the source pushed to the end. It follows the newest line unless the
	   reader has scrolled up (`isPinnedToBottom`); the bar's "latest" brings
	   it back. */
	let {
		empty = "Nothing logged yet.",
	}: {
		/** What a console with no lines at all says. */
		empty?: string;
	} = $props();

	const context = getConsoleContext();
	let view = $state<HTMLElement>();

	type Segment = { readonly text: string; readonly target: TerminalLinkTarget | undefined };

	/** A line's text cut at its URLs and file paths, the VT pane's matcher. */
	const segments = (text: string): Segment[] => {
		if (context.links === undefined) return [{ text, target: undefined }];
		const out: Segment[] = [];
		let cursor = 0;
		for (const match of matchTerminalLinks(text)) {
			if (match.start > cursor) out.push({ text: text.slice(cursor, match.start), target: undefined });
			out.push({ text: match.text, target: match.target });
			cursor = match.end;
		}
		if (cursor < text.length) out.push({ text: text.slice(cursor), target: undefined });
		return out;
	};

	const toBottom = (): void => {
		if (view) view.scrollTop = view.scrollHeight;
	};

	context.jump = () => {
		context.pinned = true;
		toBottom();
	};

	/* Following is decided BEFORE the new lines land and acted on after:
	   measured afterwards, a reader at the bottom is no longer at it. */
	$effect.pre(() => {
		void context.shown;
		if (view) context.pinned = isPinnedToBottom(view);
	});
	$effect(() => {
		void context.shown;
		if (context.pinned) toBottom();
	});

	const pickWith = (entry: LogEntry, event: KeyboardEvent): void => {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		context.pick?.(entry);
	};
</script>

<div class="log-view kit-scrollport" bind:this={view} onscroll={() => view && (context.pinned = isPinnedToBottom(view))}>
	{#if context.shown.length === 0}
		<p class="log-empty">
			{context.entries.length === 0 ? empty : "Every line is filtered out. Widen the filter or turn a level back on."}
		</p>
	{:else}
		<ol class="log-lines">
			{#each context.shown as entry (entryKey(entry))}
				{@const pick = context.pick}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex (the role is "button" whenever it is focusable) -->
				<li
					class="log-line {entry.level}"
					class:pickable={pick !== undefined}
					class:picked={context.picked !== undefined && entryKey(context.picked) === entryKey(entry)}
					role={pick ? "button" : undefined}
					tabindex={pick ? 0 : undefined}
					title={entry.detail || undefined}
					onclick={pick ? () => pick(entry) : undefined}
					onkeydown={pick ? (event) => pickWith(entry, event) : undefined}
				>
					<span class="log-at">{entry.at}</span>
					<span class="log-text"
						>{#each segments(entry.text) as segment, index (index)}{#if segment.target}{@const target =
									segment.target}<button
									type="button"
									class="log-link"
									title={context.links?.describe?.(target) ?? segment.text}
									onclick={(event) => {
										event.stopPropagation();
										context.links?.open(target);
									}}>{segment.text}</button
								>{:else}{segment.text}{/if}{/each}</span
					>
					{#if entry.repeats > 1 || entry.source}
						<span class="log-trailing">
							{#if entry.repeats > 1}
								<span class="log-repeats" title="Arrived {entry.repeats} times">×{entry.repeats}</span>
							{/if}
							{#if entry.source}<span class="log-source">{entry.source}</span>{/if}
						</span>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</div>
