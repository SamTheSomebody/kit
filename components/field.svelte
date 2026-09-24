<script lang="ts">
	import { bindScrub, SCRUB_TIP, type IconName } from "./index.ts";

	import IconButton from "./iconButton.svelte";
	import Label from "./label.svelte";

	import "./field.css";

	/* Text entry, boxless: a hairline under the line of type and nothing
	   else. A hovered field takes a quarter-strength wash, HELD THROUGH
	   FOCUS so clicking in does not make the ground flash away — without it
	   a boxless field is a line of type that happens to be a target.

	   The trailing `action` is a frameless icon behind a `|` divider. The
	   divider is what makes the slot format-agnostic: a glyph sits in it and
	   so does a word, with no other rule changing.

	   A FIELD AND ITS MESSAGE ARE ONE BLOCK. Left as bare siblings, the
	   distance between them is whatever the CONTAINER's `gap` is — 7px in a
	   control row, three times what the message asks for — so the block is
	   not optional dressing. */
	let {
		value = $bindable<string | number>(""),
		label,
		type = "text",
		placeholder = "",
		unit,
		invalid = false,
		message,
		disabled = false,
		min,
		max,
		step,
		action,
		actionLabel,
		id,
		block = true,
		class: extra = "",
		style,
		onaction,
		oninput,
		onfocus,
		onblur,
		onkeydown,
		scrub = true,
	}: {
		/* `string | number` so a numeric field binds straight to a numeric
		   model — `bind:value={config.rtp}` rather than a String()/Number()
		   pair at every call site. Svelte coerces on `type="number"`, so the
		   binding writes back the same shape the caller passed in. */
		value?: string | number;
		/* A control names itself the same way everywhere: a `Label` above it,
		   inside the same block. Doing it here rather than leaving every
		   consumer to pair the two by hand is the whole point of the kit —
		   and it is what keeps the label with the field when a row wraps. */
		label?: string;
		type?: "text" | "number" | "search" | "password";
		placeholder?: string;
		/* a suffix inside the field — "%", "×", "px" */
		unit?: string;
		invalid?: boolean;
		/* the error, which only reads as one when `invalid` is set too */
		message?: string;
		disabled?: boolean;
		min?: number;
		max?: number;
		step?: number;
		/* the trailing frameless icon */
		action?: IconName;
		actionLabel?: string;
		id?: string;
		/* A field and its message are one block. Set `block={false}` only
		   where the field is a part of a bigger control that owns the
		   layout — the slider's readout is the one case — and that control
		   then carries the message itself if it can have one. */
		block?: boolean;
		class?: string;
		/* only for a control that owns the field's width — the sliders set
		   `--digits` so the box is exactly as wide as its number */
		style?: string;
		onaction?: () => void;
		oninput?: (value: string) => void;
		onfocus?: () => void;
		onblur?: () => void;
		onkeydown?: (event: KeyboardEvent) => void;
		/* A NUMBER FIELD IS A SCRUB by default (2026-09-06): press its box and
		   drag sideways and the value follows, shift ×10 and alt ×0.1 — the
		   gesture every editor has and the one the layout inspector asked to
		   have on every field rather than on its labels alone. A press that
		   does not move is still a click that focuses and types, so nothing
		   about typing changes. Turn it off where the number is not a
		   MAGNITUDE — a year, a port, an id — and sliding it means nothing. */
		scrub?: boolean;
	} = $props();

	let box = $state<HTMLElement | undefined>(undefined);
	let input = $state<HTMLInputElement | undefined>(undefined);

	const scrubbable = $derived(type === "number" && !disabled && scrub);

	/* Clamped to the field's own bounds as it goes, not on commit: `min`/`max`
	   on an `<input type="number">` are validated when the value is submitted
	   or stepped, and a scrub writes neither — so without this a drag would
	   sail past both and leave the field invalid with no complaint. */
	const clamped = (numeric: number): number =>
		Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, numeric));

	$effect(() => {
		const handle = box;
		if (!handle || !scrubbable) {
			return;
		}
		return bindScrub(handle, {
			read: () => String(value),
			write: (text) => {
				const numeric = Number(text);
				const next = Number.isFinite(numeric) ? clamped(numeric) : undefined;
				if (next === undefined) {
					return;
				}
				value = typeof value === "number" ? next : String(next);
				oninput?.(String(next));
			},
			step: () => step ?? 1,
			click: () => input?.focus(),
		});
	});
</script>

{#snippet body()}
	<span
		class="kit-field {extra}"
		class:invalid
		class:disabled
		class:kit-scrub={scrubbable}
		title={scrubbable ? SCRUB_TIP : undefined}
		bind:this={box}
		{style}
	>
		<input
			bind:this={input}
			{id}
			{type}
			{placeholder}
			{disabled}
			{min}
			{max}
			{step}
			bind:value
			oninput={() => oninput?.(String(value))}
			onfocus={() => onfocus?.()}
			onblur={() => onblur?.()}
			onkeydown={(event) => onkeydown?.(event)}
		/>
		{#if unit}<span class="kit-unit">{unit}</span>{/if}
		{#if action}
			<IconButton
				class="kit-field-action"
				name={action}
				label={actionLabel ?? "Action"}
				{disabled}
				onclick={() => onaction?.()}
			/>
		{/if}
	</span>
{/snippet}

{#if block}
	<span class="kit-field-block">
		{#if label}
			<Label text={label} for={id} />
		{/if}
		{@render body()}
		{#if invalid && message}
			<span class="kit-field-message">{message}</span>
		{/if}
	</span>
{:else}
	{@render body()}
{/if}
