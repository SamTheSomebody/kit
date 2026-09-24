<script lang="ts">
	import "./checkbox.css";

	/* A box, a tick, and the label as part of the target. `indeterminate` is
	   a PROPERTY, not an attribute — a parent whose children disagree cannot
	   be spelled in markup alone, which is why it is set in an effect. */
	let {
		label,
		checked = $bindable(false),
		mixed = false,
		disabled = false,
		onchange,
	}: {
		label: string;
		checked?: boolean;
		mixed?: boolean;
		disabled?: boolean;
		onchange?: (checked: boolean) => void;
	} = $props();

	let box = $state<HTMLInputElement>();
	$effect(() => {
		if (box) {
			box.indeterminate = mixed;
		}
	});
</script>

<label class="kit-check" class:mixed class:disabled>
	<input bind:this={box} type="checkbox" bind:checked {disabled} onchange={() => onchange?.(checked)} />
	{label}
</label>
