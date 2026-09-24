<script lang="ts">
	import type { Snippet } from "svelte";

	import "./label.css";

	/* The caption, at the one size every control in the kit uses. `for` makes
	   it a real label; without it this is a caption over a cluster. */
	let {
		text,
		for: control,
		on = false,
		wrap = false,
		disabled = false,
		children,
	}: {
		text?: string;
		for?: string;
		/* a label that has taken the row's state — text rather than muted */
		on?: boolean;
		/* multi-line: the only place the kit sets a line-height above 1 */
		wrap?: boolean;
		disabled?: boolean;
		children?: Snippet;
	} = $props();
</script>

{#if control}
	<label class="kit-label" class:on class:wrap class:disabled for={control}>
		{#if children}{@render children()}{:else}{text}{/if}
	</label>
{:else}
	<span class="kit-label" class:on class:wrap class:disabled>
		{#if children}{@render children()}{:else}{text}{/if}
	</span>
{/if}
