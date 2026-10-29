<script lang="ts">
	import LayoutRow from "../row.svelte";
	import Slot from "../slot.svelte";
	import type { EditorProps, VectorProperty } from "./editors.ts";
	import Field from "./field.svelte";

	/* A fixed list of numbers, one field per axis, each with its axis letter
	   inside the box the way a transform reads (x 12, y 40). A change to one
	   axis proposes the whole list. */
	let { property, value, readonly, onchange }: EditorProps<VectorProperty> = $props();

	const values = $derived(
		property.axes.map((_, index) => {
			const entry = Array.isArray(value) ? value[index] : undefined;
			return typeof entry === "number" ? entry : 0;
		}),
	);

	const set = (index: number, text: string): void => {
		const trimmed = text.trim();
		const next = [...values];
		next[index] = trimmed === "" ? Number.NaN : Number(trimmed);
		onchange(next);
	};
</script>

<LayoutRow wrap="nowrap">
	{#each property.axes as axis, index (axis)}
		<Slot size="fill">
			<Field
				type="number"
				label={axis}
				value={values[index] ?? 0}
				unit={property.unit}
				step={property.step}
				disabled={readonly}
				oninput={(text) => set(index, text)}
			/>
		</Slot>
	{/each}
</LayoutRow>
