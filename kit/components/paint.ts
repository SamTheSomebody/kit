/* PRESS AND DRAG TO TOGGLE — the estate's rule for every toggling icon.
 *
 * A column of toggles is never used one at a time. Hiding eleven of fourteen
 * containers to find the one drawing over the reels is eleven round trips of
 * press, aim, press, aim; the same gesture as a swipe is one. So the gesture
 * belongs to the TOGGLE, not to whichever list happens to be holding a column
 * of them — the kit's `Tree` had it and the layout inspector's tree did not,
 * which is exactly the drift a per-component gesture guarantees
 * ([HUMAN] Sam 2026-09-06).
 *
 * ── The two rules a swipe must obey ──────────────────────────────────────
 * LATCHED, NOT FLIPPED. The first toggle pressed decides the state; every
 * toggle the pointer then crosses is written to that SAME state. A swipe that
 * flipped each one it met would be a random number generator, and crossing the
 * same toggle twice would undo it.
 *
 * ONE STROKE, ONE WRITE. A crossed toggle already in the latched state is not
 * written again — a `write` costs a scene mutation and a status line.
 *
 * ── Why the state is a module singleton ─────────────────────────────────
 * There is one pointer. A second concurrent stroke is not a thing to model,
 * and hanging the stroke off the control that started it is what forced every
 * consumer to own the gesture in the first place.
 *
 * ── Why hit-testing, not pointer capture ────────────────────────────────
 * The pointer spends the whole stroke over controls the press did not start
 * on; capture would send every move back to the one it began in. Each bound
 * toggle answers for itself when the pointer enters it.
 */

/** What a toggle can do, as the gesture needs it: read the state, write it. */
export type ToggleTarget = {
	/** the state right now — re-read per event, never cached in the stroke */
	readonly pressed: () => boolean;
	/** the caller's write; the gesture never touches the DOM state itself */
	readonly write: (on: boolean) => void;
};

/** The subset of a pointer event the gesture reads, so this rule stays DOM-free. */
export type PressGesture = {
	readonly metaKey?: boolean;
	readonly ctrlKey?: boolean;
	readonly altKey?: boolean;
	readonly shiftKey?: boolean;
	/** `0` is the primary button in every DOM event that carries one. */
	readonly button?: number;
};

/**
 * Is this press the toggle's own, or somebody else's gesture passing over it?
 *
 * A modified or non-primary press belongs to the CONTAINER — cmd/ctrl/alt and
 * the middle button are the branch fold (`foldsBranch`), and the right button
 * is the pane menu. Those must reach the row underneath untouched, so a toggle
 * claims only the plain primary press.
 */
export const paints = (event: PressGesture): boolean =>
	(event.button ?? 0) === 0 &&
	event.metaKey !== true &&
	event.ctrlKey !== true &&
	event.altKey !== true &&
	event.shiftKey !== true;

/**
 * What a crossed toggle should be written to, or `undefined` for "leave it".
 *
 * The whole latching rule, in one place: no stroke means no write, and a
 * toggle already showing the latched state is left alone.
 */
export const crossedTo = (stroke: Stroke | undefined, pressed: boolean): boolean | undefined =>
	stroke !== undefined && stroke.on !== pressed ? stroke.on : undefined;

/** A stroke in flight: the state it latched, and the document it is drawn in. */
export type Stroke = {
	readonly on: boolean;
	readonly ownerDocument: Document;
};

/* The one stroke. Read through `stroke()` so the rules above can be tested
   against a value rather than against this module's history. */
let current: Stroke | undefined;

export const stroke = (): Stroke | undefined => current;

/* `body.painting` suppresses selection for the duration (`controls.css`) — a
   swipe down a tree drags across every label it passes. The class goes on the
   document the CONTROL lives in, not on the global one: these panels mount
   into documents they do not own (a game iframe, a dock pane in another tool).
 */
const endStroke = (): void => {
	if (!current) {
		return;
	}
	current.ownerDocument.body.classList.remove("painting");
	current = undefined;
};

const beginStroke = (on: boolean, ownerDocument: Document): void => {
	endStroke();
	current = { on, ownerDocument };
	ownerDocument.body.classList.add("painting");
	/* On the window, not the button: a stroke ends wherever the pointer
	   happens to be, which is usually not where it started, and often outside
	   the panel entirely. `pointercancel` matters as much as `pointerup` — a
	   stroke the browser takes over (a scroll, a system gesture) would
	   otherwise leave `body.painting` on for the rest of the session. */
	const stop = (): void => {
		endStroke();
		ownerDocument.removeEventListener("pointerup", stop);
		ownerDocument.removeEventListener("pointercancel", stop);
	};
	ownerDocument.addEventListener("pointerup", stop);
	ownerDocument.addEventListener("pointercancel", stop);
};

/**
 * Give one toggling control the gesture. The listeners are the control's own
 * and die with it, so a list that rebuilds its rows binds the new ones and
 * forgets the old.
 *
 * The PRESS does the work, so the click that ends it must not do it again —
 * but a click with no pointer behind it is the keyboard (Enter or Space on a
 * focused control), which is the only way a keyboard user reaches this at all.
 * `detail` tells them apart: it counts pointer clicks, and is `0` for
 * activation the keyboard or a script raised.
 *
 * A plain click is stopped from bubbling — a toggle inside a row is not a
 * click on the row, and every consumer of this was already writing that
 * `stopPropagation` by hand. A MODIFIED click is not stopped: it is the
 * container's whole-list gesture passing over a control that wants no part
 * of it.
 */
export const bindToggle = (control: HTMLElement, target: ToggleTarget): void => {
	control.addEventListener("pointerdown", (event: PointerEvent) => {
		if (!paints(event)) {
			return;
		}
		const on = !target.pressed();
		beginStroke(on, control.ownerDocument);
		target.write(on);
	});
	control.addEventListener("pointerenter", () => {
		const on = crossedTo(current, target.pressed());
		if (on !== undefined) {
			target.write(on);
		}
	});
	control.addEventListener("click", (event: MouseEvent) => {
		if (!paints(event)) {
			return;
		}
		event.stopPropagation();
		if (event.detail === 0) {
			target.write(!target.pressed());
		}
	});
};
