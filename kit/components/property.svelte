<script lang="ts">
	import type { Snippet } from "svelte";

	import LayoutRow from "../row.svelte";
	import Slot from "../slot.svelte";
	import { isDense } from "./density";
	import Label from "./label.svelte";
	import { bindScrub, SCRUB_TIP } from "./scrub";

	import "./controls.css";
	import "./tooltip.css";
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

	/* In a dense pane the label of a number line scrubs it, as Unity's does:
	   the drag types into the line's one number field, so the field's own
	   handling (clamping aside) is all that runs. A line with no number
	   field, or several (a vector), keeps a plain label. */
	const dense = isDense();
	let caption = $state<HTMLElement>();
	let scrubs = $state(false);

	$effect(() => {
		if (!dense || caption === undefined || muted) return;
		const row = caption.closest(".kit-row");
		const inputs = row?.querySelectorAll<HTMLInputElement>(":scope > .kit-slot input[type='number']") ?? [];
		const input = inputs.length === 1 ? inputs[0] : undefined;
		if (input === undefined || input.disabled) return;
		const bound = (text: string, fallback: number): number => (text === "" ? fallback : Number(text));
		scrubs = true;
		const unbind = bindScrub(caption, {
			read: () => input.value,
			write: (text) => {
				const numeric = Number(text);
				if (!Number.isFinite(numeric)) return;
				const clamped = Math.min(
					bound(input.max, Number.POSITIVE_INFINITY),
					Math.max(bound(input.min, Number.NEGATIVE_INFINITY), numeric),
				);
				input.value = String(clamped);
				input.dispatchEvent(new Event("input", { bubbles: true }));
			},
			step: () => (input.step === "" || input.step === "any" ? 1 : Number(input.step)),
			click: () => input.focus(),
		});
		return () => {
			scrubs = false;
			unbind();
		};
	});
</script>

<LayoutRow>
	<Label>
		<span
			{...data}
			bind:this={caption}
			class:changed
			class:muted
			class:scrubs
			class:kit-tip={tip !== undefined}
			class:below={tip !== undefined}
			data-tip={tip}
			title={tip ?? (scrubs ? SCRUB_TIP : label)}>{label}</span
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
