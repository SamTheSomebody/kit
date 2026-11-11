<script lang="ts">
	import type { Snippet } from "svelte";

	import Container from "@samthesomebody/kit/container.svelte";
	import Field from "@samthesomebody/kit/components/field.svelte";
	import LayoutRow from "@samthesomebody/kit/row.svelte";
	import Empty from "@samthesomebody/kit/components/empty.svelte";
	import Label from "@samthesomebody/kit/components/label.svelte";
	import Pane from "@samthesomebody/kit/components/pane.svelte";

	import { setDense } from "@samthesomebody/kit/components";

	import "@samthesomebody/kit/components/dense.css";

	/* THE INSPECTOR: what is selected, by name with its type after it in the
	   muted colour (the type's tip on hover), over its body. The body is the
	   children as given — usually a `Container size="fill"` of
	   `InspectorSection`s and `Property` lines, or a view that brings its own
	   bar and scroller. Nothing selected, it says what to select.
	   The body is dense (`dense.css`): one label column for the whole pane,
	   18px rows and a bar per top-level section, as Unity draws it.
	   With `onrename` the name is a field, as Unity's name box: Enter or
	   leaving it renames (an empty or unchanged name is ignored), Escape
	   puts the name back. */
	let {
		name,
		type,
		tip,
		empty = "Nothing selected",
		onrename,
		children,
	}: {
		/** Undefined when nothing is selected. */
		name: string | undefined;
		type?: string;
		tip?: string;
		empty?: string;
		/** Makes the name editable: called with the new name. */
		onrename?: (name: string) => void;
		children: Snippet;
	} = $props();

	setDense();

	let draft = $state("");
	$effect(() => {
		draft = name ?? "";
	});

	const commit = (): void => {
		const next = draft.trim();
		if (next === "" || next === name) draft = name ?? "";
		else onrename?.(next);
	};

	const key = (event: KeyboardEvent): void => {
		if (event.key === "Enter") (event.currentTarget as HTMLElement | null)?.blur();
		else if (event.key === "Escape") {
			draft = name ?? "";
			(event.currentTarget as HTMLElement | null)?.blur();
		}
	};
</script>

<Pane fill>
	<div class="kit-dense kit-inspector">
		{#if name === undefined}
			<Container size="fill">
				<Empty text={empty} />
			</Container>
		{:else}
			<div class="kit-inspector-head">
				<LayoutRow wrap="nowrap">
					{#if onrename}
						<Field bind:value={draft} block={false} class="kit-inspector-name" onblur={commit} onkeydown={key} />
					{:else}
						<Label on text={name} />
					{/if}
					{#if type}<span title={tip}><Label text={type} /></span>{/if}
				</LayoutRow>
			</div>
			{@render children()}
		{/if}
	</div>
</Pane>

<style>
	.kit-inspector {
		display: flex;
		flex-direction: column;
		flex: 1 1 0;
		min-height: 0;
	}

	.kit-inspector-head {
		flex: none;
		padding: var(--dock-pad-tight) var(--dock-pad);
		font-weight: 600;
	}

	.kit-inspector-head :global(.kit-inspector-name) {
		flex: 1 1 auto;
		min-width: 0;
	}

	.kit-inspector-head :global(.kit-label) {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
</style>
