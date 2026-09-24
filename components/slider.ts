/* The slider's rules, with no DOM in them.
 *
 * Every defect this control shipped during the design was a rule that lived
 * in an event handler: a commit that clamped 0–100 by hand (true while every
 * slider was a percentage, a bug the moment one was a wincap — typing 12000
 * and clicking away set it to 100), a typing path that grew the range on
 * every keystroke, and a dual handle whose two inputs both wrote both values.
 * They are all here now, and they are all covered by `slider.test.ts`.
 */

export type SliderRange = {
	value: number;
	/* the CURRENT bounds — elastic ones move */
	min: number;
	max: number;
	/* the bounds a reset returns to */
	defaultMin: number;
	defaultMax: number;
	/* the bounds nothing may pass, elastic or not */
	limitMin?: number;
	limitMax?: number;
	/* "unclamped" means the TRACK, not the value */
	elastic?: boolean;
};

const finite = (n: number | undefined): n is number => typeof n === "number" && Number.isFinite(n);

/* Hard limits win first and always. `grow` is what separates typing from
   committing: mid-edit "12000" passes through 1, 12, 120 and growing on each
   would leave the range wherever the last keystroke landed. */
export const syncSlider = (state: SliderRange, next: number | string, options?: { grow?: boolean }): SliderRange => {
	let value = typeof next === "number" ? next : Number(String(next).trim());
	if (!Number.isFinite(value)) {
		value = state.value;
	}
	if (finite(state.limitMin)) {
		value = Math.max(state.limitMin, value);
	}
	if (finite(state.limitMax)) {
		value = Math.min(state.limitMax, value);
	}

	let { min, max } = state;
	if (state.elastic && options?.grow !== false) {
		if (value > max) {
			max = value;
		}
		if (value < min) {
			min = value;
		}
	} else {
		value = Math.max(min, Math.min(max, value));
	}
	return { ...state, value, min, max };
};

/* Commit — blur or Enter. An empty or unreadable field is NOT a value: the
   slider's own number goes back rather than a zero being invented. */
export const commitSlider = (state: SliderRange, typed: string): SliderRange => {
	const trimmed = typed.trim();
	const readable = trimmed !== "" && Number.isFinite(Number(trimmed));
	return syncSlider(state, readable ? trimmed : state.value);
};

/* Default bounds back, and the current value pulled inside them. */
export const resetSliderRange = (state: SliderRange): SliderRange =>
	syncSlider({ ...state, min: state.defaultMin, max: state.defaultMax }, state.value, { grow: false });

/* How full the track reads. A percentage of the CURRENT bounds, so an
   elastic track is right whatever it has grown to. */
export const sliderFill = (state: SliderRange): number => {
	const span = state.max - state.min;
	return span > 0 ? ((state.value - state.min) / span) * 100 : 0;
};

/* The field is exactly as wide as its number and the track gives up that
   width, so the control's own width never changes. It follows the number
   BOTH ways — a field that only ratchets wider ends up sized for the longest
   thing ever typed into it. */
export const sliderDigits = (value: number): number => Math.max(1, String(value).length);

export type DualRange = {
	from: number;
	to: number;
	min: number;
	max: number;
};

/* ONE writer for both values, because the pair IS one value: a knob is
   clamped by its sibling and never passes it. Two inputs each writing both
   was what made dragging either thumb rewrite the other. */
export const dualSet = (state: DualRange, side: "from" | "to", next: number): DualRange => {
	const value = Math.round(Number(next));
	if (!Number.isFinite(value)) {
		return state;
	}
	const bounded = Math.max(state.min, Math.min(state.max, value));
	return side === "from"
		? { ...state, from: Math.min(bounded, state.to) }
		: { ...state, to: Math.max(bounded, state.from) };
};

/* The pair MOVES as one. The span between the knobs is a handle of its own
   and it drags BOTH values by a single delta, so the width of the range is
   what a span drag keeps and the position is what it changes.

   The pair is RIGID, which is why the delta is clamped once against both
   ends rather than each value being clamped on its own: clamping
   separately makes the span shrink as it reaches a bound — drag far enough
   left and a 20–80 range arrives at 0–60 and then collapses to 0–0. Here
   it stops at 0–60 and stays that width. */
export const dualShift = (state: DualRange, delta: number): DualRange => {
	const step = Math.round(Number(delta));
	if (!Number.isFinite(step)) {
		return state;
	}
	const bounded = Math.max(state.min - state.from, Math.min(state.max - state.to, step));
	return { ...state, from: state.from + bounded, to: state.to + bounded };
};

/* A click on the track sends the NEARER knob there. */
export const nearerKnob = (state: DualRange, at: number): "from" | "to" =>
	Math.abs(at - state.from) <= Math.abs(at - state.to) ? "from" : "to";

/* Arrow keys, with Shift for the coarse step. Returns undefined for a key
   the knob does not answer, so the caller knows not to preventDefault. */
export const knobStep = (state: DualRange, key: string, coarse: boolean, now: number): number | undefined => {
	const step = coarse ? 10 : 1;
	if (key === "ArrowRight" || key === "ArrowUp") {
		return now + step;
	}
	if (key === "ArrowLeft" || key === "ArrowDown") {
		return now - step;
	}
	if (key === "Home") {
		return state.min;
	}
	if (key === "End") {
		return state.max;
	}
	return undefined;
};
