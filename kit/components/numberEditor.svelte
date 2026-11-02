<script lang="ts">
	import type { EditorProps, NumberProperty } from "./editors.ts";
	import Field from "./field.svelte";
	import Slider from "./slider.svelte";

	/* A number: a slider with its typed readout when the property has a
	   range and the row has room, otherwise a field that types and scrubs.
	   Text that isn't a number yet is passed on as NaN, so the tool's
	   validation can say why. */
	let { property, value, readonly, compact, onchange }: EditorProps<NumberProperty> = $props();

	const parse = (text: string): number => {
		const trimmed = text.trim();
		return trimmed === "" ? Number.NaN : Number(trimmed);
	};

	/* What the field shows: the value, and between a keystroke and the
	   tool's answer, what was typed. Leaving the field shows the value again,
	   so a number the tool clamped or refused doesn't stay on screen. */
	const stored = (): number | string => (typeof value === "number" ? value : "");
	let draft = $state<number | string>("");
	$effect.pre(() => {
		draft = stored();
	});
</script>

{#if property.slider && !compact}
	<Slider
		value={typeof value === "number" ? value : property.slider.min}
		min={property.slider.min}
		max={property.slider.max}
		step={property.step ?? 1}
		unit={property.unit}
		elastic={property.slider.elastic}
		limitMin={property.min}
		limitMax={property.max}
		disabled={readonly}
		{onchange}
	/>
{:else}
	<Field
		type="number"
		bind:value={draft}
		unit={property.unit}
		min={property.min}
		max={property.max}
		step={property.step}
		disabled={readonly}
		oninput={(text) => onchange(parse(text))}
		onblur={() => (draft = stored())}
	/>
{/if}
