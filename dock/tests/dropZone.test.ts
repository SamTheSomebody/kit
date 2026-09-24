import { describe, expect, it } from "vitest";

import { dropDecision, rootBandPx, rootZoneAt } from "../dropZone";
import { DOCK_THEME } from "../theme";

/** Fidelity walk viewport — band math is in stage pixels, not pane fractions. */
const STAGE = { left: 0, right: 800, top: 0, bottom: 560 };

describe("root band", () => {
	it("⇧ doubles the hit region", () => {
		expect(rootBandPx(DOCK_THEME.rootBand, false)).toBe(12);
		expect(rootBandPx(DOCK_THEME.rootBand, true)).toBe(24);
	});

	it("a point 18px from the edge is a miss until ⇧ doubles the band", () => {
		expect(rootZoneAt(400, 18, STAGE, rootBandPx(DOCK_THEME.rootBand, false))).toBeNull();
		expect(rootZoneAt(400, 18, STAGE, rootBandPx(DOCK_THEME.rootBand, true))).toBe("t");
	});

	it("the 12px rim itself is a hit without ⇧", () => {
		expect(rootZoneAt(400, 12, STAGE, rootBandPx(DOCK_THEME.rootBand, false))).toBe("t");
	});
});

describe("drop decision — ⇧-gated paths", () => {
	const top = rootZoneAt(400, 12, STAGE, rootBandPx(DOCK_THEME.rootBand, false));

	it("force-float: ⇧ outside the root band floats", () => {
		expect(
			dropDecision({ shiftKey: true, rootZone: rootZoneAt(400, 280, STAGE, rootBandPx(DOCK_THEME.rootBand, true)) }),
		).toEqual({ land: "float" });
	});

	it("root band over a strip without ⇧ joins the strip", () => {
		expect(dropDecision({ shiftRoot: true, shiftKey: false, rootZone: top })).toEqual({ land: "target" });
	});

	it("root band over a strip with ⇧ root-splits", () => {
		expect(dropDecision({ shiftRoot: true, shiftKey: true, rootZone: top })).toEqual({ land: "root", zone: "t" });
	});

	it("a body drop on the rim root-splits without ⇧", () => {
		expect(dropDecision({ shiftKey: false, rootZone: top })).toEqual({ land: "root", zone: "t" });
	});

	it("root wins over force-float when ⇧ sits in the doubled band", () => {
		const inDoubled = rootZoneAt(400, 18, STAGE, rootBandPx(DOCK_THEME.rootBand, true));
		expect(dropDecision({ shiftKey: true, rootZone: inDoubled })).toEqual({ land: "root", zone: "t" });
	});
});
