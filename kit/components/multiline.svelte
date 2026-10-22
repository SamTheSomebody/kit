<script lang="ts">
	import type { IconName } from "./index.ts";

	import IconButton from "./iconButton.svelte";
	import Label from "./label.svelte";

	import "./field.css";

	/* The same field, taller, with its action in the top-right corner.
	
	   THE ACTION'S ERGONOMICS ARE THE POINT. `data-empty` and `data-typing`
	   are the two facts CSS cannot read for itself: whether the box holds
	   anything, and whether someone is mid-sentence. Empty, the action is
	   always there — it is the fastest way to fill an empty box. With
	   content it appears on hover only, and it HIDES WHILE TYPING, because
	   a button sitting over the corner of a sentence being written is a
	   target you did not ask for. Moving the pointer clears the typing flag,
	   and that is the same gesture that reveals the action with content, so
	   one movement always brings it back. */
	let {
		value = $bindable(""),
		label,
		placeholder = "",
		rows = 4,
		disabled = false,
		action,
		actionLabel,
		id,
		onaction,
		oninput,
	}: {
		value?: string;
		label?: string;
		placeholder?: string;
		rows?: number;
		disabled?: boolean;
		action?: IconName;
		actionLabel?: string;
		id?: string;
		onaction?: () => void;
		oninput?: (value: string) => void;
	} = $props();

	let typing = $state(false);
	const empty = $derived(value.trim() === "");
</script>

<span class="kit-field-block">
	{#if label}
		<Label text={label} for={id} />
	{/if}
	<span
		class="kit-field multiline"
		role="group"
		class:disabled
		data-empty={empty ? "" : undefined}
		data-typing={typing ? "" : undefined}
		onpointermove={() => (typing = false)}
	>
		<textarea
			{id}
			{rows}
			{placeholder}
			{disabled}
			bind:value
			oninput={() => {
				typing = true;
				oninput?.(value);
			}}
			onblur={() => (typing = false)}></textarea>
		{#if action}
			<IconButton
				class="kit-field-action kit-corner-action"
				name={action}
				label={actionLabel ?? "Action"}
				{disabled}
				onclick={() => onaction?.()}
			/>
		{/if}
	</span>
</span>
