<script lang="ts">
	import { scrollFromRail, scrollState, withinReach } from "./index.ts";
	import type { Snippet } from "svelte";

	import "./controls.css";
	import "./scroll.css";

	/* THE DOCK STRIP'S TWO DEVICES, TURNED NINETY DEGREES: a gradient fade on
	   whichever side has more, and a bar that only asserts itself when you
	   go for it. The rail IS a progress bar — the same two colours
	   `.kit-progress` uses to say the same thing.

	   IT GROWS OUTWARD, INNER EDGE FIXED: the hairline sits on the pane's own
	   edge and every pixel of growth happens beyond it, 1px to half of
	   `--tool-space-3` (6px), once the pointer is within
	   `--tool-scroll-reach`. Nothing is reserved and nothing is covered.

	   WHY IT IS DRAWN AND NOT NATIVE: styling `::-webkit-scrollbar` gets the
	   colours, but macOS decides when an overlay bar is VISIBLE — by default
	   only during a scroll gesture. A bar that appears a second after you
	   scrolled cannot report where you are, and cannot thicken as you
	   approach, because it is not there when you approach. It also takes 0px
	   of layout width, so widening it paints over content. */
	let { children, height }: { children: Snippet; height?: string } = $props();

	/* the scrollport needs an id for the rail's `aria-controls` — one per
	   instance, so two panes on a page do not point at each other */
	const uid = $props.id();
	const viewId = `kit-scroll-${uid}`;

	let frame = $state<HTMLElement>();
	let view = $state<HTMLElement>();
	let thumb = $state<HTMLElement>();
	let bar = $state(scrollState({ scrollTop: 0, scrollHeight: 0, clientHeight: 0 }));
	let near = $state(false);
	let dragging = $state<{ grab: number } | undefined>();

	const metrics = () => ({
		scrollTop: view?.scrollTop ?? 0,
		scrollHeight: view?.scrollHeight ?? 0,
		clientHeight: view?.clientHeight ?? 0,
	});

	const sync = (): void => {
		bar = scrollState(metrics());
	};

	$effect(sync);

	/* The view resizing and its CONTENT changing are separate events, and
	   neither is a scroll: content that arrives after mount (a list that
	   loads, a panel that re-renders longer) has to show the rail too.
	   Same observers as `bindScroll`. */
	$effect(() => {
		const element = view;
		if (!element) return;
		const sizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
		sizes?.observe(element);
		const content = typeof MutationObserver === "undefined" ? null : new MutationObserver(sync);
		content?.observe(element, { childList: true, subtree: true, characterData: true });
		return () => {
			sizes?.disconnect();
			content?.disconnect();
		};
	});

	const reach = (): number =>
		Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tool-scroll-reach")) || 48;

	const railTo = (clientY: number, grab: number): void => {
		if (!frame || !view || !thumb) {
			return;
		}
		const rail = frame.getBoundingClientRect();
		view.scrollTop = scrollFromRail(
			clientY,
			{ top: rail.top, height: rail.height },
			thumb.offsetHeight,
			grab,
			metrics(),
		);
		sync();
	};
</script>

<svelte:window
	onpointermove={(event) => {
		if (dragging) {
			railTo(event.clientY, dragging.grab);
			return;
		}
		if (!frame || !bar.hasMore) return;
		near = withinReach({ x: event.clientX, y: event.clientY }, frame.getBoundingClientRect(), reach());
	}}
	onpointerup={() => (dragging = undefined)}
	onpointercancel={() => (dragging = undefined)}
	onblur={() => (dragging = undefined)}
/>

<span
	class="kit-scroll"
	class:has-more={bar.hasMore}
	class:can-up={bar.canUp}
	class:can-down={bar.canDown}
	class:near={near || dragging !== undefined}
	class:dragging={dragging !== undefined}
	bind:this={frame}
	style="--view: {bar.view}; --at: {bar.at}; {height ? `height: ${height}` : ''}"
>
	<span class="kit-scroll-view" id={viewId} bind:this={view} onscroll={sync}>
		{@render children()}
	</span>
	<i class="kit-scroll-fade up"></i>
	<i class="kit-scroll-fade down"></i>
	<!-- a real scrollbar role: the rail reports where the view is and can
	     be dragged to move it, which is exactly what the role means -->
	<span
		class="kit-scroll-rail"
		role="scrollbar"
		aria-controls={viewId}
		aria-orientation="vertical"
		aria-valuenow={Math.round(bar.at)}
		aria-valuemin={0}
		aria-valuemax={100}
		tabindex="-1"
		onpointerdown={(event) => {
			if (!thumb) return;
			const box = thumb.getBoundingClientRect();
			/* a press on the track above or below the thumb jumps to it first */
			const grab = event.clientY < box.top || event.clientY > box.bottom ? box.height / 2 : event.clientY - box.top;
			dragging = { grab };
			railTo(event.clientY, grab);
			event.preventDefault();
		}}
	>
		<span class="kit-scroll-thumb" bind:this={thumb}></span>
	</span>
</span>
