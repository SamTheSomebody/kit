<script lang="ts">
	import type { Snippet } from "svelte";

	import Container from "@samthesomebody/kit/container.svelte";
	import LayoutRow from "@samthesomebody/kit/row.svelte";
	import Empty from "@samthesomebody/kit/components/empty.svelte";
	import Label from "@samthesomebody/kit/components/label.svelte";
	import Pane from "@samthesomebody/kit/components/pane.svelte";

	/* THE INSPECTOR: what is selected, by name with its type after it in the
	   muted colour (the type's tip on hover), over its body. The body is the
	   children as given — usually a `Container size="fill"` of
	   `InspectorSection`s and `Property` lines, or a view that brings its own
	   bar and scroller. Nothing selected, it says what to select. */
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
</script>

<Pane fill>
	{#if name === undefined}
		<Container size="fill">
			<Empty text={empty} />
		</Container>
	{:else}
		<Container size="fit">
			<LayoutRow wrap="nowrap">
				<Label on text={name} />
				{#if type}<span title={tip}><Label text={type} /></span>{/if}
			</LayoutRow>
		</Container>
		{@render children()}
	{/if}
</Pane>
