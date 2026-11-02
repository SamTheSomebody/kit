import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { bindScrub } from "../scrub.ts";
import { reseedSlider, sameSliderBounds, syncSlider, type SliderRange } from "../slider.ts";

describe("reseedSlider", () => {
	const seeded: SliderRange = { value: 40, min: 0, max: 100, defaultMin: 0, defaultMax: 100 };

	it("takes new bounds outright and pulls the value inside them", () => {
		const next = reseedSlider(seeded, { min: 0, max: 10, limitMin: undefined, limitMax: undefined, elastic: false });
		expect(next).toMatchObject({ value: 10, min: 0, max: 10, defaultMin: 0, defaultMax: 10 });
	});

	it("drops an elastic track's growth from the old bounds", () => {
		const grown = syncSlider({ ...seeded, elastic: true }, 500);
		expect(grown.max).toBe(500);
		const next = reseedSlider(grown, { min: 0, max: 50, limitMin: undefined, limitMax: undefined, elastic: true });
		expect(next).toMatchObject({ min: 0, max: 500, defaultMax: 50, value: 500 });
		const smaller = reseedSlider({ ...grown, value: 20 }, { min: 0, max: 50, limitMin: undefined, limitMax: undefined, elastic: true });
		expect(smaller).toMatchObject({ min: 0, max: 50, value: 20 });
	});

	it("keeps limits", () => {
		const next = reseedSlider(seeded, { min: 0, max: 100, limitMin: 0, limitMax: 30, elastic: false });
		expect(next.value).toBe(30);
	});
});

describe("sameSliderBounds", () => {
	it("compares what a consumer passes, field by field", () => {
		const bounds = { min: 0, max: 1, limitMin: undefined, limitMax: undefined, elastic: false };
		expect(sameSliderBounds(bounds, { ...bounds })).toBe(true);
		expect(sameSliderBounds(bounds, { ...bounds, max: 2 })).toBe(false);
		expect(sameSliderBounds(bounds, { ...bounds, elastic: true })).toBe(false);
	});
});

/* A handle with just what `bindScrub` touches; no DOM in this suite. */
class FakeHandle extends EventTarget {
	readonly classes = new Set<string>();
	readonly ownerDocument = {
		body: {
			classList: {
				add: (name: string): void => void this.classes.add(name),
				remove: (name: string): void => void this.classes.delete(name),
			},
		},
	};
	setPointerCapture(): void {}
	contains(): boolean {
		return false;
	}
}

const pointer = (type: string, clientX: number): Event =>
	Object.assign(new Event(type), { button: 0, clientX, pointerId: 1, shiftKey: false, altKey: false });

describe("bindScrub", () => {
	const globals = globalThis as { Element?: unknown };
	let hadElement = false;
	beforeEach(() => {
		hadElement = "Element" in globals;
		if (!hadElement) globals.Element = class {};
	});
	afterEach(() => {
		if (!hadElement) delete globals.Element;
	});

	const start = (): { handle: FakeHandle; writes: string[]; commits: number[]; unbind: () => void } => {
		const handle = new FakeHandle();
		const writes: string[] = [];
		const commits: number[] = [];
		const unbind = bindScrub(handle as unknown as HTMLElement, {
			read: () => "10",
			write: (text) => void writes.push(text),
			commit: () => void commits.push(1),
		});
		handle.dispatchEvent(pointer("pointerdown", 0));
		handle.dispatchEvent(pointer("pointermove", 40));
		return { handle, writes, commits, unbind };
	};

	it("unbinding mid-drag ends the drag without committing", () => {
		const { handle, writes, commits, unbind } = start();
		expect(handle.classes.has("scrubbing")).toBe(true);
		expect(writes.length).toBeGreaterThan(0);
		unbind();
		expect(handle.classes.has("scrubbing")).toBe(false);
		handle.dispatchEvent(pointer("pointermove", 80));
		expect(writes).toHaveLength(1);
		expect(commits).toHaveLength(0);
	});

	it("losing pointer capture ends the drag like a release", () => {
		const { handle, commits } = start();
		handle.dispatchEvent(new Event("lostpointercapture"));
		expect(handle.classes.has("scrubbing")).toBe(false);
		expect(commits).toHaveLength(1);
	});
});
