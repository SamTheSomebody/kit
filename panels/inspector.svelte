<script lang="ts">
	import type { Snippet } from "svelte";

	import Container from "@samthesomebody/kit/container.svelte";
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
	   18px boxed values and a bar per top-level section, as Unity draws it. */
	let {
		name,
		type,
		tip,
		empty = "Nothing selected",
		children,
	}: {
		/** Undefined when nothing is selected. */
		name: string | undefined;
		type?: string;
		tip?: string;
		empty?: string;
		children: Snippet;
	} = $props();

	setDense();
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
					<Label on text={name} />
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

	.kit-inspector-head :global(.kit-label) {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
</style>
