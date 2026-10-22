<script lang="ts">
	import "./thumb.css";

	/* ONE PLATE CELL — a square on a ground, the image filling it, a caption
	   under it, faded when it has been ruled out.

	   The CELL only. The two art-curate views that share it do not share what
	   is around it: one is a drag source in a drop tray with pointer
	   hit-testing, the other a click-to-open button in a card with badges.
	   Promoting the surroundings would have forced them to agree on things
	   they are right to differ on ([HUMAN] Sam 2026-09-05). So the caller owns
	   the element around this, its interactions and its focus; this draws the
	   box.

	   `ground` is a colour the CALLER supplies, because a plate sits on the
	   matte its pipeline gave it — the art tools' magenta — and which matte
	   that is has nothing to do with the kit's palette. */
	let {
		src,
		alt,
		caption,
		ground,
		size,
		faded = false,
	}: {
		src: string;
		alt: string;
		caption?: string;
		/** The matte behind the image. Defaults to the panel ground. */
		ground?: string;
		/** Any CSS length; the cell is square. */
		size?: string;
		/** Ruled out — visible, dimmed. */
		faded?: boolean;
	} = $props();

	const style = $derived(
		[ground ? `--thumb-ground: ${ground}` : "", size ? `--thumb-size: ${size}` : ""].filter(Boolean).join("; "),
	);
</script>

<span class="kit-thumb" class:faded {style}>
	<span class="kit-thumb-plate">
		<img {src} {alt} loading="lazy" draggable="false" />
	</span>
	{#if caption}<span class="kit-thumb-caption">{caption}</span>{/if}
</span>
