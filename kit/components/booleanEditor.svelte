<script lang="ts">
	import Button from "./button.svelte";
	import Checkbox from "./checkbox.svelte";
	import { isDense } from "./density";
	import type { BooleanProperty, EditorProps } from "./editors.ts";

	/* Two states: the kit's latching key, labelled with its on state. In a
	   dense pane (an inspector) it is a checkbox, the row's label naming it. */
	let { value, readonly, onchange }: EditorProps<BooleanProperty> = $props();

	const dense = isDense();
</script>

{#if dense}
	<Checkbox label="" disabled={readonly} bind:checked={() => value === true, (next) => onchange(next)} />
{:else}
	<Button label="On" checked={value === true} disabled={readonly} onclick={() => onchange(value !== true)} />
{/if}
