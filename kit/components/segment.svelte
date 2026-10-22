<script lang="ts">
	import type { IconName } from "./index.ts";

	import Button from "./button.svelte";

	import "./segment.css";

	/* Keys butted together with a hairline SEAM in the gap between them —
	   in the padding and nowhere else, because nothing is drawn behind a
	   plate. That is what lets every control keep the one disabled rule
	   (`--tool-muted` at `--tool-disabled-opacity`) instead of a group
	   dimming by colour and a translucent plate leaking the rail beneath.

	   The seam counters the key's latch travel on the SAME timeline, so the
	   join does not move and does not wobble on the way. */
	let {
		options,
		value = $bindable(),
		multiple = false,
		disabled = false,
		onchange,
	}: {
		options: { value: string; label: string; icon?: IconName; disabled?: boolean }[];
		/* one value, or a list of them when `multiple` */
		value?: string | string[];
		multiple?: boolean;
		disabled?: boolean;
		onchange?: (value: string | string[]) => void;
	} = $props();

	const chosen = (option: string): boolean => (Array.isArray(value) ? value.includes(option) : value === option);

	const choose = (option: string): void => {
		if (multiple) {
			const list = Array.isArray(value) ? value : [];
			value = list.includes(option) ? list.filter((v) => v !== option) : [...list, option];
		} else {
			value = option;
		}
		onchange?.(value);
	};
</script>

<div class="kit-segment" role={multiple ? "group" : "radiogroup"}>
	{#each options as option (option.value)}
		<Button
			class="kit-segment-item"
			label={option.label}
			icon={option.icon}
			pressed={chosen(option.value)}
			disabled={disabled || option.disabled}
			onclick={() => choose(option.value)}
		/>
	{/each}
</div>
