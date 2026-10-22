<script lang="ts">
	import { GESTURES, GLYPHS, SPRITES, type IconName, ICON_SPRITE } from "./index.ts";

	import "./icon.css";

	/* One sheet per document, mounted by whichever icon renders first. A
	   `<use>` cannot reach a symbol that is not in the document, and putting
	   the sheet in every component that draws one would put it in the DOM
	   dozens of times. */
	const SHEET_ID = "kit-icon-sprite";
	const mountSprite = (): void => {
		if (typeof document === "undefined" || document.getElementById(SHEET_ID)) {
			return;
		}
		const host = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		host.id = SHEET_ID;
		host.setAttribute("aria-hidden", "true");
		host.style.display = "none";
		host.innerHTML = ICON_SPRITE;
		document.body.prepend(host);
	};

	let { name, on = false }: { name: IconName; on?: boolean } = $props();

	const glyph = $derived(GLYPHS[name]);
	const sprite = $derived(SPRITES[name]);
	const gesture = $derived(GESTURES.has(name));

	$effect(() => {
		if (sprite) {
			mountSprite();
		}
	});
</script>

<!-- A `.kit-glyph` wrapper for a glyph or a drawn icon: the 12px sizing rule
     is `.kit-icon svg, .kit-glyph svg`, so a bare `<svg>` dropped into a key
     has no width at all and fills the button.

     NOT for a gesture. `.kit-mouse` is one monospace CELL wide and drawn at
     stroke 1.1, and `.kit-glyph svg` (0,1,1) outranks `.kit-mouse` (0,1,0) —
     wrapped, a mouse rendered 12px at stroke 1 in the kit's muted grey where
     the artifact draws 1ch in the accent. Found by the fidelity probe,
     2026-09-05; it is why a gesture is set inline, as type. -->
{#if gesture && sprite}
	<svg class="kit-mouse" aria-hidden="true"><use href="#{sprite.off}" /></svg>
{:else}
	<span class="kit-glyph" aria-hidden="true">
		{#if glyph}
			{glyph}
		{:else if sprite}
			<!-- A toggle draws BOTH forms and CSS picks by `aria-pressed` on the
			     button around it, so the state lives in the attribute a screen
			     reader reads rather than in a class the markup must keep in step. -->
			<svg data-when={sprite.on ? "off" : undefined}>
				<use href="#{sprite.off}" />
			</svg>
			{#if sprite.on}
				<svg data-when="on"><use href="#{sprite.on}" /></svg>
			{/if}
		{/if}
	</span>
{/if}
