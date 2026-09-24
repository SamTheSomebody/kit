<script lang="ts">
	import "./spinner.css";

	/* spine-publish `.export-wheel`: accent tip on a border ring. Use when
	   work is running and there is no total (probe, import, export head). */
	let {
		label = "Loading",
	}: {
		/* accessible name; the ring itself is silent */
		label?: string;
	} = $props();
</script>

<span class="kit-spinner" role="status" aria-label={label}></span>
