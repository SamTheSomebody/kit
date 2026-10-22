<script lang="ts">
	import "./meta.css";

	/* Facts in two columns: a muted term and a tabular value. Every tool had
	   its own; this is the one. */
	let { rows }: { rows: { term: string; value: string }[] } = $props();
</script>

<dl class="kit-meta">
	{#each rows as row (row.term)}
		<dt>{row.term}</dt>
		<dd>{row.value}</dd>
	{/each}
</dl>
