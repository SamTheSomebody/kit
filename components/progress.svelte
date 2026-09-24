<script lang="ts">
	import "./progress.css";

	/* The slider's own track with the knob removed: same hairline weight,
	   same accent fill, same `--fill`. Determinate reads left to right;
	   indeterminate sweeps a third of the track, because work with no total
	   still has to look like work. The sweep is a CSS animation and the
	   reduced-motion rule stops it dead, which is why the track keeps a
	   visible accent stub when it does. */
	let {
		value,
		label,
		max = 100,
	}: {
		/* omit for indeterminate */
		value?: number;
		label?: string;
		max?: number;
	} = $props();

	const percent = $derived(value === undefined ? 0 : Math.max(0, Math.min(100, (value / max) * 100)));
</script>

<div
	class="kit-progress"
	data-indeterminate={value === undefined ? "" : undefined}
	style="--fill: {percent}"
	role="progressbar"
	aria-valuenow={value}
	aria-valuemax={max}
	aria-label={label}
>
	<span class="kit-progress-track"></span>
	{#if label}<span class="kit-progress-value">{label}</span>{/if}
</div>
