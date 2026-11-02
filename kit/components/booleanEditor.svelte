<script lang="ts">
	import Button from "./button.svelte";
	import type { BooleanProperty, EditorProps } from "./editors.ts";

	/* Two states: the kit's latching key, labelled with its on state. */
	let { value, readonly, onchange }: EditorProps<BooleanProperty> = $props();
</script>

<Button label="On" checked={value === true} disabled={readonly} onclick={() => onchange(value !== true)} />
