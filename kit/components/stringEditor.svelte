<script lang="ts">
	import type { EditorProps, StringProperty } from "./editors.ts";
	import Field from "./field.svelte";

	/* A line of text. Bound to a draft that follows the value, so text the
	   tool refused goes back to the value when the field is left. */
	let { value, readonly, onchange }: EditorProps<StringProperty> = $props();

	const stored = (): string => (typeof value === "string" ? value : "");
	let draft = $state("");
	$effect.pre(() => {
		draft = stored();
	});
</script>

<Field
	bind:value={draft}
	disabled={readonly}
	oninput={(text) => onchange(text)}
	onblur={() => (draft = stored())}
/>
