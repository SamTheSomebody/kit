<script lang="ts">
	import type { EditorProps } from "./editors.ts";
	import Label from "./label.svelte";

	/* The fallback for a type with no editor: the value, read only, as text. */
	let { value }: EditorProps = $props();

	const text = $derived(
		value === undefined ? "" : typeof value === "string" ? value : (JSON.stringify(value) ?? String(value)),
	);
</script>

<Label text={text} />
