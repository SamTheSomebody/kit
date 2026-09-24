<script lang="ts">
	import { commitSlider, sliderDigits, sliderFill, syncSlider, type SliderRange } from "./index.ts";
	import { untrack } from "svelte";

	import Field from "./field.svelte";
	import Label from "./label.svelte";

	import "./slider.css";
	import "./field.css";

	/* ONE VALUE, TWO WAYS IN: the track writes the field, the field writes
	   the track, and the fill follows either.

	   The readout is a FIELD, not a label. A number you can see and cannot
	   type is a wall, and a slider is the one control where the exact value
	   matters more than the gesture. It is sized to the digits actually in
	   it, and the TRACK gives up that width, so the control's own width
	   never changes. It follows the number both ways — a field that only
	   ratchets wider ends up sized for the longest thing ever typed.

	   "UNCLAMPED" MEANS THE TRACK, NOT THE VALUE. Typing past the max grows
	   the range; `limitMin`/`limitMax` are a separate pair a typed value is
	   always clamped to, so a fat finger cannot ask for a 500,000× wincap.

	   Every bound lives in `slider.ts` and nothing here may clamp by hand.
	   The commit path used to pin 0–100 itself, which was true while every
	   slider was a percentage and became a bug the moment one was not. */
	let {
		value = $bindable(0),
		min = 0,
		max = 100,
		step = 1,
		unit,
		label,
		elastic = false,
		limitMin,
		limitMax,
		disabled = false,
		id,
		onchange,
	}: {
		value?: number;
		min?: number;
		max?: number;
		step?: number;
		unit?: string;
		label?: string;
		/* the unclamped variant: the track stretches to hold what was typed */
		elastic?: boolean;
		limitMin?: number;
		limitMax?: number;
		disabled?: boolean;
		id?: string;
		onchange?: (value: number) => void;
	} = $props();

	/* The bounds a reset returns to, and the working range, both read the
	   props ONCE on purpose: an elastic track's `min`/`max` move away from
	   what the consumer passed, and re-reading them would drag the range
	   back every time the component re-rendered. `untrack` says so rather
	   than leaving svelte-check to guess. */
	const seed = untrack(() => ({
		value,
		min,
		max,
		defaultMin: min,
		defaultMax: max,
		limitMin,
		limitMax,
		elastic,
	}));
	let range = $state<SliderRange>(seed);
	let typed = $state(String(value));
	let editing = $state(false);

	const write = (next: SliderRange): void => {
		range = next;
		value = next.value;
		if (!editing) {
			typed = String(next.value);
		}
		onchange?.(next.value);
	};

	/* Typing does NOT grow an elastic track. Halfway through "12000" the
	   field says 1, then 12, then 120, and growing on each would leave the
	   range wherever the last keystroke landed. The track pins at its max
	   while the number is above it and the range moves on COMMIT. */
	const onType = (raw: string): void => {
		typed = raw;
		/* mid-edit an empty field is not a zero, it is nothing typed yet —
		   acting on it would lose the number being replaced */
		if (raw.trim() === "") {
			return;
		}
		write(syncSlider(range, raw, { grow: false }));
	};

	const commit = (): void => {
		editing = false;
		write(commitSlider(range, typed));
	};

	export const resetRange = (): void =>
		write(syncSlider({ ...range, min: range.defaultMin, max: range.defaultMax }, range.value, { grow: false }));

	const fill = $derived(sliderFill(range));
	const digits = $derived(sliderDigits(range.value));
</script>

<div
	class="kit-slider"
	class:unclamped={elastic}
	class:disabled
	style="--fill: {fill}; --digits: {digits}"
	data-default-min={range.defaultMin}
	data-default-max={range.defaultMax}
>
	{#if label}<Label text={label} for={id} />{/if}
	<input
		type="range"
		min={range.min}
		max={range.max}
		{step}
		{disabled}
		value={range.value}
		oninput={(event) => write(syncSlider(range, event.currentTarget.value))}
	/>
	<!-- Commit is blur OR Enter, and both land in one place. The field is
	     never written back while it has focus, so what was typed stays on
	     screen whichever way the value settles. -->
	<Field
		{id}
		type="number"
		{unit}
		{disabled}
		block={false}
		value={typed}
		oninput={onType}
		onfocus={() => (editing = true)}
		onblur={commit}
		onkeydown={(event) => {
			if (event.key !== "Enter") return;
			event.preventDefault();
			commit();
		}}
	/>
</div>
