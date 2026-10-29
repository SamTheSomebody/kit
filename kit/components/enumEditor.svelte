<script lang="ts">
	import type { EditorProps, EnumProperty } from "./editors.ts";
	import Segment from "./segment.svelte";
	import Select from "./select.svelte";

	/* One of a set: a segment for up to three options in a row, a select
	   past that or in a compact cell. */
	const SEGMENT_MAX = 3;

	let { property, value, readonly, compact, onchange }: EditorProps<EnumProperty> = $props();
	const current = $derived(typeof value === "string" ? value : "");
</script>

{#if !compact && property.options.length <= SEGMENT_MAX}
	<Segment options={[...property.options]} value={current} disabled={readonly} onchange={(next) => onchange(next)} />
{:else}
	<Select options={[...property.options]} value={current} disabled={readonly} onchange={(next) => onchange(next)} />
{/if}
