import type { DockZone } from "./types";

export type RootZone = Exclude<DockZone, "c">;

export type DropDecision = { land: "root"; zone: RootZone } | { land: "float" } | { land: "target" };

/** ⇧ doubles the outermost root-split band. */
export const rootBandPx = (rootBand: number, shiftKey: boolean): number => (shiftKey ? rootBand * 2 : rootBand);

/** Stage-relative nearest-edge hit. `band` is already ⇧-adjusted. */
export const rootZoneAt = (
	clientX: number,
	clientY: number,
	rect: { left: number; right: number; top: number; bottom: number },
	band: number,
): RootZone | null => {
	const left = clientX - rect.left;
	const right = rect.right - clientX;
	const top = clientY - rect.top;
	const bottom = rect.bottom - clientY;
	const nearest = Math.min(left, right, top, bottom);
	if (nearest > band) {
		return null;
	}
	if (nearest === left) {
		return "l";
	}
	if (nearest === right) {
		return "r";
	}
	if (nearest === top) {
		return "t";
	}
	return "b";
};

/**
 * Drop precedence: root band (⇧-gated on strips via `shiftRoot`) → ⇧-float
 * → the target's own zone.
 */
export const dropDecision = (args: {
	shiftRoot?: boolean;
	shiftKey: boolean;
	rootZone: RootZone | null;
}): DropDecision => {
	if (args.rootZone && (!args.shiftRoot || args.shiftKey)) {
		return { land: "root", zone: args.rootZone };
	}
	if (args.shiftKey) {
		return { land: "float" };
	}
	return { land: "target" };
};
