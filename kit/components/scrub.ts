/* Scrub — drag a number sideways to change it.
 *
 * Two halves, like every other gesture in the kit: the ARITHMETIC (pure,
 * tested here) and the BINDING (`bindScrub`, the pointer sequence that spends
 * it), so a consumer gets the gesture rather than re-deriving it. Promoted out
 * of `play/layoutPanel` on 2026-09-06 — the layout inspector had it on
 * its field labels only, and every numeric field in the estate wants it.
 *
 * Everything operates on the FIRST numeric token of the text, so `"12%"`
 * steps the 12 and a pair `"1, 2"` steps the x component. That is what lets
 * one gesture serve a plain number, a percentage and a component of a pair
 * without any of them telling it which they are.
 */

/** Horizontal pixels of drag per step — Unity-ish scrub sensitivity. */
export const PIXELS_PER_STEP = 2;

const roundStep = (value: number): number => Math.round(value * 1000) / 1000;

/** Step the first numeric token by `step`; an empty text starts from it. */
export const stepText = (text: string, step: number): string => {
	const match = /-?\d+(\.\d+)?/.exec(text);
	if (!match) {
		return text === "" ? String(roundStep(step)) : text;
	}
	const stepped = roundStep(Number(match[0]) + step);
	return text.slice(0, match.index) + String(stepped) + text.slice(match.index + match[0].length);
};

/** The scrubbed text for a drag: total pixel delta from the gesture start. */
export const scrubText = (startText: string, deltaPixels: number, stepMagnitude: number): string =>
	stepText(startText, Math.trunc(deltaPixels / PIXELS_PER_STEP) * stepMagnitude);

/**
 * The magnitude one step of the drag (or one arrow press) moves the value by.
 *
 * Shift coarsens and alt refines, the pair every scrub in every editor uses.
 * Stated once here so the arrow keys and the drag can never disagree about
 * what a modifier means.
 */
export const scrubMagnitude = (
	step: number,
	modifiers: { readonly shiftKey?: boolean; readonly altKey?: boolean },
): number => step * (modifiers.shiftKey ? 10 : modifiers.altKey ? 0.1 : 1);

/** The one hint every scrubbable control carries, so they all read alike. */
export const SCRUB_TIP = "drag sideways to adjust — shift ×10, alt ×0.1";

export type ScrubPorts = {
	/** The text to scrub from. Read once, at the start of each gesture. */
	readonly read: () => string;
	/** Live during the drag: the scrubbed text, every step of the way. */
	readonly write: (text: string) => void;
	/** The value one step moves by, before modifiers. Defaults to 1. */
	readonly step?: () => number;
	/** The drag ended and it MOVED — a caller re-reads or re-renders here. */
	readonly commit?: () => void;
	/** The press was a click, not a drag. An input focuses itself here. */
	readonly click?: () => void;
};

/**
 * Bind the drag to `handle` — a field's own box, or a label acting as one.
 *
 * THE PRESS IS CLAIMED, and that is the load-bearing decision. `pointerdown`
 * is prevented, so pressing a numeric field places no caret and steals no
 * focus; a press that never moves calls `click` instead, which is where an
 * input focuses and selects itself. Without that, every attempt to drag an
 * `<input>` starts a text selection and the number jitters under a highlight.
 *
 * The pointer capture is best-effort: synthetic events carry no active
 * pointer and `setPointerCapture` throws on them, so a scripted drag still
 * works for as long as the cursor stays over the handle.
 *
 * Returns the unbind, because a panel that re-renders its rows must not leave
 * a listener on a node it has dropped.
 */
export const bindScrub = (handle: HTMLElement, ports: ScrubPorts): (() => void) => {
	const onPointerDown = (downEvent: PointerEvent): void => {
		if (downEvent.button !== 0) {
			return;
		}
		/* A field's box can hold a trailing action, and a tree row's label can
		   hold an eye. Claiming the press over one of those would make the
		   button undraggable AND unclickable, so the gesture yields to
		   anything that is already a target in its own right. */
		const target = downEvent.target;
		if (target instanceof Element) {
			const interactive = target.closest("button, a, select, [role='button'], [role='switch']");
			if (interactive && interactive !== handle && handle.contains(interactive)) {
				return;
			}
		}
		downEvent.preventDefault();
		try {
			handle.setPointerCapture(downEvent.pointerId);
		} catch {
			/* synthetic pointer — the drag still tracks while over the handle */
		}
		const startX = downEvent.clientX;
		const startText = ports.read();
		let engaged = false;

		const move = (moveEvent: PointerEvent): void => {
			const deltaPixels = moveEvent.clientX - startX;
			if (!engaged && Math.abs(deltaPixels) < PIXELS_PER_STEP) {
				return;
			}
			if (!engaged) {
				engaged = true;
				/* The whole page takes the cursor and stops selecting, exactly as
				   the toggle swipe does — a drag that crosses out of the handle
				   must not paint a selection across whatever it lands on. */
				handle.ownerDocument.body.classList.add("scrubbing");
			}
			const next = scrubText(startText, deltaPixels, scrubMagnitude(ports.step?.() ?? 1, moveEvent));
			ports.write(next);
		};

		const finish = (): void => {
			handle.removeEventListener("pointermove", move);
			handle.removeEventListener("pointerup", finish);
			handle.removeEventListener("pointercancel", finish);
			handle.ownerDocument.body.classList.remove("scrubbing");
			if (engaged) {
				ports.commit?.();
			} else {
				ports.click?.();
			}
		};

		handle.addEventListener("pointermove", move);
		handle.addEventListener("pointerup", finish);
		handle.addEventListener("pointercancel", finish);
	};

	handle.addEventListener("pointerdown", onPointerDown);
	return () => handle.removeEventListener("pointerdown", onPointerDown);
};
