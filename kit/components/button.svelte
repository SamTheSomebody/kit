<script lang="ts">
	import type { IconName } from "./index.ts";
	import type { Snippet } from "svelte";

	import Icon from "./icon.svelte";

	import "./button.css";

	/* THE KEY. A plate on a hard edge that latches: pressed or checked, it
	   travels the full 2px and the edge goes, so a mode reads as held in and
	   a momentary press reads as the same motion released.

	   A tone is a RECOLOUR, never a rebuild. The edge is `--key-edge` and
	   `box-shadow` is declared on the base rule, the latch and `:active`
	   only — a variant that declared its own beat `:active`'s cancel on
	   specificity (pressing a button also hovers it) and the press read
	   wrong. */
	let {
		label,
		icon,
		tone = "default",
		pressed,
		checked,
		busy = false,
		disabled = false,
		tip,
		class: extra = "",
		onclick,
		children,
	}: {
		label?: string;
		icon?: IconName;
		tone?: "default" | "primary" | "danger";
		/* a toggle button */
		pressed?: boolean;
		/* a setting. `role="switch"` is what makes this a SETTING rather than
		   a pressed button; the key reads `aria-checked` exactly as it reads
		   `aria-pressed`, so there is no second control to maintain. */
		checked?: boolean;
		/* busy is not disabled: it keeps the wait cursor and the status light,
		   where disabled takes the default cursor and dims. */
		busy?: boolean;
		disabled?: boolean;
		tip?: string;
		class?: string;
		onclick?: (event: MouseEvent) => void;
		children?: Snippet;
	} = $props();
</script>

<button
	type="button"
	class="btn btn-key {tone === 'default' ? '' : tone} {extra}"
	role={checked === undefined ? undefined : "switch"}
	aria-pressed={pressed}
	aria-checked={checked}
	aria-busy={busy ? "true" : undefined}
	aria-label={label === undefined ? tip : undefined}
	title={tip}
	{disabled}
	{onclick}
>
	{#if busy}
		<!-- the kit's busy marker is the dock's status light, not a second
		     spinner: one device for "something is happening here". -->
		<i class="dock-tab-dot" data-status="busy" aria-hidden="true"></i>
	{:else if icon}
		<Icon name={icon} on={pressed === true || checked === true} />
	{/if}
	{#if children}{@render children()}{:else if label}{label}{/if}
</button>
