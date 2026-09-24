/**
 * Follow a dock slot with an element the dock does not own.
 *
 * THE PROBLEM THIS EXISTS FOR. The kit re-renders its whole tree on any
 * structural change and re-parents each pane's content host. That is cheap
 * for content the framework owns — the node moves, the component keeps its
 * state — and fatal for content that cannot survive a re-parent. An iframe
 * RE-NAVIGATES. A `<video>` restarts. A scroll position is lost. Measured in
 * the compare tool 2026-09-04: clicking any tab, including one in an
 * unrelated pane, reloaded both game frames and lost the round on screen.
 *
 * So the fragile element lives in one fixed-position layer the kit never
 * touches, and what the kit renders into the pane is an empty SLOT. The
 * element follows its slot's rect; when the tab goes inactive the kit
 * destroys the slot and the element simply hides, still loaded. Nothing
 * reloads — not a tab switch, not a drag to another pane, not a collapse.
 *
 * Promoted out of the compare workbench's `src/frame.ts` 2026-09-05 (then
 * `tools/capture/compareUi/`, now `tools/editor/editorUi/`), when the
 * planning editor's preview needed exactly the same thing. The compare tool's
 * frame keeps its own sizing on top of this; what is shared is the following.
 *
 * A FOLLOWED SLOT MUST BE AN IMPERATIVE TAB (`render`/`destroy`), NOT A
 * SNIPPET. The Svelte wrapper PARKS a snippet's host off-screen when its tab
 * goes inactive rather than destroying it — that is exactly what keeps the
 * component's state alive across a re-render — so a Svelte action's `destroy`
 * never runs and the followed element stays where it was, over whatever tab
 * you switched to. Measured in the planning editor 2026-09-05: the parked
 * slot reported `left: -99999, 0×0` and the iframe sat unmoved on top of the
 * brief. `render`/`destroy` is the seam the kit documents for content it does
 * not own, and this is the reason it exists.
 *
 * The general fix — a kit that re-renders only the subtree that changed — is
 * still the right answer and still not written (`tools/ui/STATUS.md`). Until
 * it is, this is how a tool keeps an iframe alive.
 */

export type SlotRect = {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
};

export type SlotFollower = {
	/** Follow this slot: show the element and track the slot's rect. */
	attach(slot: HTMLElement): void;
	/** The slot is gone (tab inactive, pane collapsed): hide, stay loaded. */
	detach(): void;
	/** Re-read the slot's rect. Cheap; call it on any dock mutation. */
	sync(): void;
	/** The slot currently followed, if any. */
	slot(): HTMLElement | undefined;
	destroy(): void;
};

export const followSlot = (args: {
	/** The element to move. It is positioned absolutely inside `layer`. */
	element: HTMLElement;
	/** A fixed-position layer outside the dock's tree. */
	layer: HTMLElement;
	/** Told the rect whenever it changes, for anything that must resize with it. */
	onRect?: (rect: SlotRect) => void;
}): SlotFollower => {
	args.layer.append(args.element);
	args.element.hidden = true;

	let slot: HTMLElement | undefined;
	let last: SlotRect | undefined;

	const sync = (): void => {
		if (!slot || !slot.isConnected) {
			return;
		}
		const box = slot.getBoundingClientRect();
		/* Floored, so a rounding pixel never spills past the pane edge — the
		   layer is fixed-position and nothing else clips it. */
		const rect: SlotRect = {
			left: Math.floor(box.left),
			top: Math.floor(box.top),
			width: Math.floor(box.width),
			height: Math.floor(box.height),
		};
		args.element.style.left = `${rect.left}px`;
		args.element.style.top = `${rect.top}px`;
		args.element.style.width = `${rect.width}px`;
		args.element.style.height = `${rect.height}px`;
		if (
			!last ||
			last.left !== rect.left ||
			last.top !== rect.top ||
			last.width !== rect.width ||
			last.height !== rect.height
		) {
			last = rect;
			args.onRect?.(rect);
		}
	};

	/* Event-driven, never polled. A slot's size changes on every geometry
	   change that can reach it — sash drag, collapse, window resize — because
	   in a split tree a pane cannot move without its own or an ancestor's size
	   changing. */
	const observer = new ResizeObserver(() => sync());

	return {
		attach: (next) => {
			if (slot) {
				observer.unobserve(slot);
			}
			slot = next;
			observer.observe(next);
			args.element.hidden = false;
			sync();
		},
		detach: () => {
			if (slot) {
				observer.unobserve(slot);
			}
			slot = undefined;
			args.element.hidden = true;
		},
		sync,
		slot: () => slot,
		destroy: () => {
			observer.disconnect();
			args.element.remove();
		},
	};
};
