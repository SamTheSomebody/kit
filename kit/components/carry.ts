/* CARRY: dragging a thing out of one control and dropping it on another.
 *
 * Unity's object hookup: a row of the Project or the Hierarchy is dragged
 * onto a slot that takes that kind of thing. It's pointer-driven, not HTML5
 * drag and drop, because the tree's own move gesture is pointer-driven and a
 * drag has to turn from a move into a carry as it leaves the tree.
 *
 * THE PROTOCOL IS DOM EVENTS ON THE DOCUMENT, never module state. A tool one
 * realm mounts into another's page (the docked editor's frame) has its own
 * copy of this module, and the source and the slot may sit on either side of
 * that line. The document is the one thing they share:
 * - `kit-carry-start` / `kit-carry-end` on the document, so every slot can
 *   say ahead of time whether it would take what's carried;
 * - `kit-carry-over` (cancelable: `preventDefault()` accepts),
 *   `kit-carry-leave` and `kit-carry-drop` on the `[data-kit-drop]` element
 *   under the pointer.
 * Every event's `detail` is the {@link Carried}.
 */

/** What a carry holds: one item, named by its kind and id. */
export type Carried = {
	/** What it is, as a slot asks for it: `event`, `motion`, `node`, `asset`… */
	readonly kind: string;
	readonly id: string;
	/** What the ghost under the pointer reads. */
	readonly label: string;
};

export const CARRY_START = "kit-carry-start";
export const CARRY_END = "kit-carry-end";
export const CARRY_OVER = "kit-carry-over";
export const CARRY_LEAVE = "kit-carry-leave";
export const CARRY_DROP = "kit-carry-drop";

/** Whether `value` is a {@link Carried}: an event's `detail` may come from another realm's code. */
export const isCarried = (value: unknown): value is Carried =>
	typeof value === "object" &&
	value !== null &&
	typeof (value as Carried).kind === "string" &&
	typeof (value as Carried).id === "string" &&
	typeof (value as Carried).label === "string";

/** A carry in flight: follow the pointer, then drop or cancel. */
export type Carry = {
	readonly carried: Carried;
	/** Follows the pointer to `x`, `y` (client coordinates). */
	move: (x: number, y: number) => void;
	/** Drops on whatever accepts at `x`, `y`; true when something took it. */
	drop: (x: number, y: number) => boolean;
	/** Ends the carry with nothing dropped. */
	cancel: () => void;
};

/**
 * Starts carrying `carried` out of `source`: a ghost follows the pointer, and slots under it are
 * asked whether they take it. The ghost reads `refused` while nothing under the pointer does. It's
 * drawn in the source's `.dock-stage` (where a page that scopes the tokens has them), else the body.
 */
export const startCarry = (source: Element, carried: Carried): Carry => {
	const doc = source.ownerDocument;
	const view = doc.defaultView ?? window;
	const fire = (target: EventTarget, type: string, cancelable = false): boolean =>
		target.dispatchEvent(new view.CustomEvent(type, { detail: carried, cancelable }));

	const ghost = doc.createElement("div");
	ghost.className = "kit-carry-ghost refused";
	ghost.textContent = carried.label;
	(source.closest(".dock-stage") ?? doc.body).append(ghost);
	doc.body.classList.add("carrying");
	fire(doc, CARRY_START);

	let over: Element | undefined;
	let accepted = false;

	const hover = (x: number, y: number): void => {
		const target = doc.elementFromPoint(x, y)?.closest("[data-kit-drop]") ?? undefined;
		if (target !== over) {
			if (over) fire(over, CARRY_LEAVE);
			over = target;
			accepted = false;
		}
		/* asked on every move, so a slot can change its mind (it's disabled now) */
		if (over) accepted = !fire(over, CARRY_OVER, true);
		ghost.classList.toggle("refused", !accepted);
	};

	let ended = false;
	const end = (): void => {
		if (ended) return;
		ended = true;
		if (over) fire(over, CARRY_LEAVE);
		ghost.remove();
		doc.body.classList.remove("carrying");
		fire(doc, CARRY_END);
	};

	return {
		carried,
		move: (x, y) => {
			if (ended) return;
			ghost.style.left = `${x}px`;
			ghost.style.top = `${y}px`;
			hover(x, y);
		},
		drop: (x, y) => {
			if (ended) return false;
			hover(x, y);
			const target = accepted ? over : undefined;
			end();
			if (target) fire(target, CARRY_DROP);
			return target !== undefined;
		},
		cancel: end,
	};
};

/** A drop target's answers; each gets what's carried. */
export type CarryTarget = {
	/** Whether this target takes `carried`. */
	accepts: (carried: Carried) => boolean;
	/** `carried` was dropped here. */
	ondrop: (carried: Carried) => void;
	/** A carry started that this target would take (`ready`), or it ended (`undefined`). */
	onready?: (ready: Carried | undefined) => void;
	/** The pointer is over this target with something it takes, or it left. */
	onover?: (over: boolean) => void;
};

/**
 * Makes `element` a drop target: marks it `data-kit-drop` and answers the carry events. Returns
 * the unbind.
 */
export const bindCarryTarget = (element: HTMLElement, target: CarryTarget): (() => void) => {
	const doc = element.ownerDocument;
	const detail = (event: Event): Carried | undefined => {
		const value: unknown = (event as CustomEvent).detail;
		return isCarried(value) ? value : undefined;
	};
	const start = (event: Event): void => {
		const carried = detail(event);
		if (carried && target.accepts(carried)) target.onready?.(carried);
	};
	const stop = (): void => target.onready?.(undefined);
	const over = (event: Event): void => {
		const carried = detail(event);
		const takes = carried !== undefined && target.accepts(carried);
		if (takes) event.preventDefault();
		target.onover?.(takes);
	};
	const leave = (): void => target.onover?.(false);
	const drop = (event: Event): void => {
		const carried = detail(event);
		if (carried && target.accepts(carried)) target.ondrop(carried);
	};

	element.dataset.kitDrop = "";
	doc.addEventListener(CARRY_START, start);
	doc.addEventListener(CARRY_END, stop);
	element.addEventListener(CARRY_OVER, over);
	element.addEventListener(CARRY_LEAVE, leave);
	element.addEventListener(CARRY_DROP, drop);
	return () => {
		delete element.dataset.kitDrop;
		doc.removeEventListener(CARRY_START, start);
		doc.removeEventListener(CARRY_END, stop);
		element.removeEventListener(CARRY_OVER, over);
		element.removeEventListener(CARRY_LEAVE, leave);
		element.removeEventListener(CARRY_DROP, drop);
	};
};
