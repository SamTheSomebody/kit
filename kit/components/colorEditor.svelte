<script lang="ts">
	import LayoutRow from "../row.svelte";
	import type { ColorProperty, EditorProps } from "./editors.ts";
	import Field from "./field.svelte";

	/* A colour: the OS swatch picker, and in a row the hex beside it to type.
	   Text that isn't a colour yet is marked and not proposed. */
	let { property, value, readonly, compact, onchange }: EditorProps<ColorProperty> = $props();

	const HEX6 = /^(?:#|0x)?([0-9a-f]{6})$/i;
	const HEX3 = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i;

	/** `#rrggbb` from typed text: `#abc`, `abc`, `#aabbcc`, `0xaabbcc`. */
	const parseHex = (text: string): string | undefined => {
		const trimmed = text.trim();
		const long = HEX6.exec(trimmed);
		if (long?.[1] !== undefined) return `#${long[1].toLowerCase()}`;
		const short = HEX3.exec(trimmed);
		if (short === null) return undefined;
		return `#${short
			.slice(1, 4)
			.map((digit) => `${digit}${digit}`)
			.join("")
			.toLowerCase()}`;
	};

	const toHex = (stored: unknown): string | undefined => {
		if (typeof stored === "number" && Number.isInteger(stored) && stored >= 0 && stored <= 0xffffff) {
			return `#${stored.toString(16).padStart(6, "0")}`;
		}
		return typeof stored === "string" ? parseHex(stored) : undefined;
	};

	const fromHex = (hex: string): number | string =>
		property.format === "number" ? Number.parseInt(hex.slice(1), 16) : hex;

	const hex = $derived(toHex(value) ?? "#000000");
	let unreadable = $state(false);

	const type = (text: string): void => {
		const parsed = parseHex(text);
		unreadable = parsed === undefined;
		if (parsed !== undefined) onchange(fromHex(parsed));
	};
</script>

<LayoutRow wrap="nowrap">
	<input
		class="kit-swatch"
		type="color"
		value={hex}
		title={hex}
		disabled={readonly}
		oninput={(event) => onchange(fromHex(event.currentTarget.value))}
	/>
	{#if !compact}
		<Field value={hex} invalid={unreadable} disabled={readonly} oninput={type} />
	{/if}
</LayoutRow>

<style>
	.kit-swatch {
		flex: none;
		inline-size: calc(var(--tool-space-4) * 2);
		block-size: calc(var(--tool-font-size-body) * 1.5);
		padding: 0;
		border: var(--dock-divider) solid var(--tool-border);
		background: none;
		cursor: pointer;
	}

	.kit-swatch:disabled {
		opacity: var(--tool-disabled-opacity);
		cursor: default;
	}

	.kit-swatch::-webkit-color-swatch-wrapper {
		padding: 0;
	}

	/* Separate rules: an unknown pseudo-element drops every selector in its list. */
	.kit-swatch::-webkit-color-swatch {
		border: 0;
	}

	.kit-swatch::-moz-color-swatch {
		border: 0;
	}
</style>
