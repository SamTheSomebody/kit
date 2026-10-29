<script lang="ts">
	import type { EditorProps, StringProperty } from "./editors.ts";
	import Field from "./field.svelte";

	/* A line of text. */
	let { value, readonly, onchange }: EditorProps<StringProperty> = $props();
</script>

<Field value={typeof value === "string" ? value : ""} disabled={readonly} oninput={(text) => onchange(text)} />
