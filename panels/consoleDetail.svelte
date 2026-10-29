<script lang="ts">
	import { getConsoleContext } from "./console.svelte";

	/* The picked line in full: its text unwrapped from the list, and its
	   detail. Nothing when no line is picked. */
	const context = getConsoleContext();
</script>

{#if context.picked}
	<div class="log-detail log-line {context.picked.level}">
		<span class="log-text">{context.picked.text}</span>
		{#if context.picked.detail}<span class="log-detail-more">{context.picked.detail}</span>{/if}
	</div>
{/if}
