/* The drawn rail's arithmetic. Everything here is a pure reading of three
   numbers a scrollport reports, which is why the rail can be a progress bar:
   the same two values `.kit-progress` draws from say where you are and how
   much you can see. */

export type ScrollMetrics = {
	scrollTop: number;
	scrollHeight: number;
	clientHeight: number;
};

export type ScrollState = {
	/* is there anything past either edge at all */
	hasMore: boolean;
	canUp: boolean;
	canDown: boolean;
	/* percentages the thumb is drawn from */
	view: number;
	at: number;
};

export const scrollState = ({ scrollTop, scrollHeight, clientHeight }: ScrollMetrics): ScrollState => {
	const past = scrollHeight - clientHeight;
	const hasMore = past > 1;
	return {
		hasMore,
		canUp: hasMore && scrollTop > 1,
		canDown: hasMore && scrollTop < past - 1,
		view: hasMore ? (clientHeight / scrollHeight) * 100 : 100,
		at: hasMore ? (scrollTop / scrollHeight) * 100 : 0,
	};
};

/* Proximity. The rail grows outward from the frame's trailing edge, so a
   pointer slightly PAST that edge is still approaching it — hence the
   quarter-reach of tolerance on the far side. */
export const withinReach = (
	pointer: { x: number; y: number },
	box: { top: number; bottom: number; right: number },
	reach: number,
): boolean => {
	const withinBand = pointer.y >= box.top && pointer.y <= box.bottom;
	const distance = box.right - pointer.x;
	return withinBand && distance > -reach / 4 && distance < reach;
};

/* Where a drag of the thumb puts the scrollport. `grab` is where in the
   thumb the press landed, so the thumb does not jump under the pointer; a
   press on the track above or below it centres instead. */
export const scrollFromRail = (
	clientY: number,
	rail: { top: number; height: number },
	thumbHeight: number,
	grab: number,
	metrics: ScrollMetrics,
): number => {
	const travel = rail.height - thumbHeight;
	const at = travel > 0 ? (clientY - rail.top - grab) / travel : 0;
	return Math.max(0, Math.min(1, at)) * (metrics.scrollHeight - metrics.clientHeight);
};

/* ── the binding ─────────────────────────────────────────────────────
   The arithmetic above, spent on real elements. Same two halves as
   `bindScrub`: a consumer gets the rail rather than re-deriving it, and the
   plain-DOM hosts (the dock's tab panes, the DEV panels) draw the same bar
   the kit's Svelte `scroll.svelte` draws from these same functions.

   The chrome is BUILT here, not asked of the caller: the four elements and
   the class contract are what `scroll.css` styles, and a host that had to
   spell them out could spell them out wrong. The caller owns only the two
   boxes — a frame that does not scroll and a view that does. */

/** A bound rail. `sync` re-reads the view; `destroy` puts the DOM back. */
export type BoundScroll = {
	readonly sync: () => void;
	readonly destroy: () => void;
};

const REACH_FALLBACK = 48;

const reachOf = (element: HTMLElement): number => {
	const view = element.ownerDocument.defaultView;
	if (!view) {
		return REACH_FALLBACK;
	}
	return (
		Number.parseFloat(
			view.getComputedStyle(element.ownerDocument.documentElement).getPropertyValue("--tool-scroll-reach"),
		) || REACH_FALLBACK
	);
};

let railSeed = 0;

/**
 * Draw the kit's rail on `frame` for the scrollport `view`.
 *
 * `frame` holds the chrome and must not scroll; `view` is the scrollport and
 * must be inside it. Both get their kit class here, so a host that already
 * has the two boxes — `.dock-body` around `.dock-content`, say — keeps its
 * own markup and its own render contract.
 *
 * Nothing polls: the rail re-reads on the view's `scroll`, on a size change
 * of the view or its content, and on a mutation of what is inside it. That
 * last one is what a tab pane needs — a panel that re-renders its rows
 * changes what there is to scroll without either box resizing.
 */
export const bindScroll = (frame: HTMLElement, view: HTMLElement): BoundScroll => {
	const document = frame.ownerDocument;
	const window = document.defaultView;
	frame.classList.add("kit-scroll");
	view.classList.add("kit-scroll-view");
	if (!view.id) {
		view.id = `kit-scroll-${(railSeed += 1)}`;
	}

	const fadeUp = document.createElement("i");
	fadeUp.className = "kit-scroll-fade up";
	const fadeDown = document.createElement("i");
	fadeDown.className = "kit-scroll-fade down";
	const rail = document.createElement("span");
	rail.className = "kit-scroll-rail";
	/* a real scrollbar role: the rail reports where the view is and can be
	   dragged to move it, which is exactly what the role means */
	rail.setAttribute("role", "scrollbar");
	rail.setAttribute("aria-controls", view.id);
	rail.setAttribute("aria-orientation", "vertical");
	rail.setAttribute("aria-valuemin", "0");
	rail.setAttribute("aria-valuemax", "100");
	rail.tabIndex = -1;
	const thumb = document.createElement("span");
	thumb.className = "kit-scroll-thumb";
	rail.append(thumb);
	frame.append(fadeUp, fadeDown, rail);

	const metrics = (): ScrollMetrics => ({
		scrollTop: view.scrollTop,
		scrollHeight: view.scrollHeight,
		clientHeight: view.clientHeight,
	});

	let state = scrollState(metrics());
	let dragging: { grab: number } | null = null;

	const sync = (): void => {
		state = scrollState(metrics());
		frame.classList.toggle("has-more", state.hasMore);
		frame.classList.toggle("can-up", state.canUp);
		frame.classList.toggle("can-down", state.canDown);
		frame.style.setProperty("--view", String(state.view));
		frame.style.setProperty("--at", String(state.at));
		rail.setAttribute("aria-valuenow", String(Math.round(state.at)));
		if (!state.hasMore) {
			frame.classList.remove("near");
		}
	};

	const railTo = (clientY: number, grab: number): void => {
		const box = frame.getBoundingClientRect();
		view.scrollTop = scrollFromRail(clientY, { top: box.top, height: box.height }, thumb.offsetHeight, grab, metrics());
		sync();
	};

	const onScroll = (): void => sync();
	const onPointerMove = (event: PointerEvent): void => {
		if (dragging) {
			railTo(event.clientY, dragging.grab);
			return;
		}
		if (!state.hasMore) {
			return;
		}
		const box = frame.getBoundingClientRect();
		frame.classList.toggle("near", withinReach({ x: event.clientX, y: event.clientY }, box, reachOf(frame)));
	};
	const onPointerUp = (): void => {
		if (!dragging) {
			return;
		}
		dragging = null;
		frame.classList.remove("dragging");
	};
	const onRailDown = (event: PointerEvent): void => {
		const box = thumb.getBoundingClientRect();
		/* a press on the track above or below the thumb jumps to it first */
		const grab = event.clientY < box.top || event.clientY > box.bottom ? box.height / 2 : event.clientY - box.top;
		dragging = { grab };
		frame.classList.add("dragging", "near");
		railTo(event.clientY, grab);
		event.preventDefault();
	};

	view.addEventListener("scroll", onScroll, { passive: true });
	rail.addEventListener("pointerdown", onRailDown);
	window?.addEventListener("pointermove", onPointerMove);
	window?.addEventListener("pointerup", onPointerUp);

	/* the view resizing, and its CONTENT resizing, are two different events
	   and a pane gets both — the second one is a panel re-rendering longer */
	const sizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => sync());
	sizes?.observe(view);
	const children = typeof MutationObserver === "undefined" ? null : new MutationObserver(() => sync());
	children?.observe(view, { childList: true, subtree: true, characterData: true });

	sync();

	return {
		sync,
		destroy: () => {
			view.removeEventListener("scroll", onScroll);
			rail.removeEventListener("pointerdown", onRailDown);
			window?.removeEventListener("pointermove", onPointerMove);
			window?.removeEventListener("pointerup", onPointerUp);
			sizes?.disconnect();
			children?.disconnect();
			fadeUp.remove();
			fadeDown.remove();
			rail.remove();
			frame.classList.remove("kit-scroll", "has-more", "can-up", "can-down", "near", "dragging");
			frame.style.removeProperty("--view");
			frame.style.removeProperty("--at");
			view.classList.remove("kit-scroll-view");
		},
	};
};
