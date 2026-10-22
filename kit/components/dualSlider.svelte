<script lang="ts">
	import { dualSet, dualShift, knobStep, nearerKnob, sliderDigits, type DualRange } from "./index.ts";

	import Field from "./field.svelte";
	import Label from "./label.svelte";

	import "./slider.css";
	import "./field.css";

	/* A RANGE, not two sliders. It is its own control rather than a flag on
	   `Slider` for one reason: `syncSlider` knows one value and one field,
	   and letting it near a pair was what made dragging either thumb rewrite
	   both. Here there is ONE writer — `dualSet` — and a knob is clamped by
	   its sibling, never past it.

	   The knobs are buttons, so focus, tab order and the arrow keys are the
	   browser's to deliver and only the stepping is ours. Two stacked native
	   ranges were tried first: the lower thumb was ungrabbable wherever the
	   two overlapped, which is most of the useful range.

	   THE SPAN IS A HANDLE of its own: the rect between the knobs drags both
	   values by one delta and keeps the range's width, which is the gesture
	   you want whenever the pair is a window over something. It writes
	   through `dualShift` and not through `dualSet` twice — two clamped
	   writes squash the span as it reaches a bound — and it drags from the
	   range the pointer went DOWN on rather than from the last frame, so a
	   drag that runs into a bound and comes back returns to where it was
	   instead of losing the distance it spent there.

	   THE DASH BELONGS TO THE PAIR, not to either value, so it sits between
	   the two fields rather than inside the first — a `–` in the floor's own
	   box reads as the floor's unit, which is exactly what `%` and `×` are. */
	let {
		from = $bindable(0),
		to = $bindable(100),
		min = 0,
		max = 100,
		unit,
		label,
		disabled = false,
		onchange,
	}: {
		from?: number;
		to?: number;
		min?: number;
		max?: number;
		unit?: string;
		label?: string;
		disabled?: boolean;
		onchange?: (range: { from: number; to: number }) => void;
	} = $props();

	let track = $state<HTMLElement>();
	let dragging = $state<"from" | "to" | "span" | undefined>();
	/* the range and the pointer position the span drag STARTED from */
	let grabbed = $state<{ at: number; from: number; to: number }>();

	const range = $derived<DualRange>({ from, to, min, max });

	const write = (side: "from" | "to", value: number): void => {
		const next = dualSet(range, side, value);
		from = next.from;
		to = next.to;
		onchange?.({ from, to });
	};

	const atPointer = (clientX: number): number => {
		if (!track) {
			return min;
		}
		const box = track.getBoundingClientRect();
		return min + ((clientX - box.left) / box.width) * (max - min);
	};

	const shift = (clientX: number): void => {
		if (!grabbed) {
			return;
		}
		const next = dualShift({ from: grabbed.from, to: grabbed.to, min, max }, atPointer(clientX) - grabbed.at);
		from = next.from;
		to = next.to;
		onchange?.({ from, to });
	};

	const percent = (value: number): number => ((value - min) / (max - min)) * 100;
</script>

<svelte:window
	onpointermove={(event) => {
		if (!dragging) return;
		if (dragging === "span") shift(event.clientX);
		else write(dragging, atPointer(event.clientX));
	}}
	onpointerup={() => {
		dragging = undefined;
		grabbed = undefined;
	}}
/>

<div class="kit-slider dual" class:disabled data-dual style="--from: {percent(from)}; --to: {percent(to)}">
	{#if label}<Label text={label} />{/if}
	<span
		class="kit-dual"
		role="group"
		aria-label={label ?? "Range"}
		bind:this={track}
		onpointerdown={(event) => {
			if (disabled || (event.target as HTMLElement).closest(".kit-dual-knob, .kit-dual-span")) return;
			/* a click on the track sends the NEARER knob there */
			const at = atPointer(event.clientX);
			const side = nearerKnob(range, at);
			write(side, at);
			dragging = side;
		}}
	>
		<span class="kit-dual-fill"></span>
		<!-- BEFORE the knobs on purpose: absolute siblings paint in DOM order,
		     and where the two values are close the span's rect covers both
		     knobs — the ends have to stay grabbable, so they paint last -->
		<button
			type="button"
			class="kit-dual-span"
			aria-label="{label ?? 'Range'} span"
			{disabled}
			onpointerdown={(event) => {
				dragging = "span";
				grabbed = { at: atPointer(event.clientX), from, to };
				event.preventDefault();
			}}
			onkeydown={(event) => {
				/* the keys a knob answers, read as a delta: Home and End land
				   the pair against a bound because the shift is clamped */
				const next = knobStep(range, event.key, event.shiftKey, from);
				if (next === undefined) return;
				event.preventDefault();
				const moved = dualShift(range, next - from);
				from = moved.from;
				to = moved.to;
				onchange?.({ from, to });
			}}
		></button>
		{#each ["from", "to"] as const as side (side)}
			<button
				type="button"
				class="kit-dual-knob"
				data-knob={side}
				role="slider"
				aria-label="{label ?? 'Range'} {side}"
				aria-valuenow={side === "from" ? from : to}
				aria-valuemin={min}
				aria-valuemax={max}
				{disabled}
				onpointerdown={(event) => {
					dragging = side;
					event.preventDefault();
				}}
				onkeydown={(event) => {
					const now = side === "from" ? from : to;
					const next = knobStep(range, event.key, event.shiftKey, now);
					if (next === undefined) return;
					event.preventDefault();
					write(side, next);
				}}
			></button>
		{/each}
	</span>
	<Field
		type="number"
		{disabled}
		block={false}
		value={String(from)}
		style="--digits: {sliderDigits(from)}"
		oninput={(raw) => write("from", Number(raw))}
	/>
	<Label text="–" />
	<Field
		type="number"
		{unit}
		{disabled}
		block={false}
		value={String(to)}
		style="--digits: {sliderDigits(to)}"
		oninput={(raw) => write("to", Number(raw))}
	/>
</div>
