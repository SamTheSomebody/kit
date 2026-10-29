<script lang="ts">
	import { editors, type Property, type Registry, type EditorDefinition } from "./editors.ts";

	/* The editor for a property, from the registry: its named editor, else
	   the best match for its type, else the read-only fallback. */
	let {
		property,
		value,
		readonly = false,
		compact = false,
		onchange,
		registry = editors,
	}: {
		property: Property;
		value: unknown;
		readonly?: boolean;
		compact?: boolean;
		onchange: (value: unknown) => void;
		/** Defaults to the kit's; a tool with its own editors passes its registry. */
		registry?: Registry<Property, EditorDefinition>;
	} = $props();

	const Editor = $derived(registry.resolve(property)?.component);
</script>

{#if Editor}
	<Editor {property} {value} {readonly} {compact} {onchange} />
{/if}
