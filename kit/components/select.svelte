<script lang="ts">
	import Label from "./label.svelte";

	import "./field.css";
	import "./select.css";

	/* The field again, with a native `select` in it and a caret drawn over
	   the trailing edge. The caret is inside the field's own box and takes
	   no pointer events of its own, so clicking it opens the menu — a caret
	   you can see and cannot press is a button-shaped decoration. */
	let {
		value = $bindable(""),
		label,
		options,
		disabled = false,
		id,
		onchange,
	}: {
		value?: string;
		label?: string;
		options: { value: string; label: string; disabled?: boolean }[];
		disabled?: boolean;
		id?: string;
		onchange?: (value: string) => void;
	} = $props();
</script>

<span class="kit-field-block">
	{#if label}
		<Label text={label} for={id} />
	{/if}
	<span class="kit-field" class:disabled>
		<select {id} {disabled} bind:value onchange={() => onchange?.(value)}>
			{#each options as option (option.value)}
				<option value={option.value} disabled={option.disabled}>{option.label}</option>
			{/each}
		</select>
		<span class="kit-caret" aria-hidden="true">▾</span>
	</span>
</span>
