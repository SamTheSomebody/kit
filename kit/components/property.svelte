<script lang="ts">
	import type { Snippet } from "svelte";

	import LayoutRow from "../row.svelte";
	import Slot from "../slot.svelte";
	import Label from "./label.svelte";

	import "./field.css";

	/* ONE LINE OF AN INSPECTOR, inside a `Column recipe="fields"`: the label
	   (accent when changed, muted when it can't be edited here, the tip on
	   hover) and the editor taking the slack, its message hung under it, and
	   the line's own keys (revert, remove) after it. The editor is a child —
	   usually a `PropertyEditor` — so a tool can put anything there. */
	let {
		label,
		tip,
		changed = false,
		muted = false,
		error,
		data,
		below,
		status,
		children,
	}: {
		label: string;
		tip?: string;
		changed?: boolean;
		muted?: boolean;
		/** Why the last edit was refused, hung under the editor. */
		error?: string;
		/** Attributes for the label, for a tool that finds lines by them (`data-…`). */
		data?: Record<string, string>;
		/** More under the editor, inside its block: where an override comes from. */
		below?: Snippet;
		/** The line's keys after the editor. */
		status?: Snippet;
		children: Snippet;
	} = $props();
</script>

<LayoutRow>
	<Label>
		<span
			{...data}
			class:changed
			class:muted
			class:kit-tip={tip !== undefined}
			class:below={tip !== undefined}
			data-tip={tip}
			title={tip}>{label}</span
		>
	</Label>
	<Slot size="fill">
		<!-- One block for the editor and its message, so the message hangs under the control. -->
		<span class="kit-field-block">
			{@render children()}
			{#if error !== undefined}
				<span class="kit-field-message">{error}</span>
			{/if}
			{@render below?.()}
		</span>
		{@render status?.()}
	</Slot>
</LayoutRow>

<style>
	.changed {
		color: var(--tool-accent);
	}

	.muted {
		opacity: var(--tool-disabled-opacity);
	}
</style>
