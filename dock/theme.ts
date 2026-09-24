/**
 * Dock kit token layer — the ONE source of truth for every number and color
 * the kit uses (`docs/specs/2026-09-03-dock-kit-design.md` §Token layer).
 * `dock.css` consumes only `var(--dock-*)` / `var(--tool-*)`; the view's
 * pointer math reads this same record via `themeOf`, so a knob can never
 * double-source (the artifact's `DIVIDER` / `--dock-divider` pair is exactly
 * what this outlaws). `applyDockTheme` writes the variables on one
 * `.dock-stage`, so themes hot-swap at runtime and per-stage.
 *
 * Colors and fonts are never defined by the kit: every color token defaults
 * to a `--tool-*` reference (or a color-mix of one), so reskinning
 * `tools/ui/tokens.css` reskins every dock — the float shadows included,
 * since `--tool-shadow-1/-2` landed there in phase 2 (spec §Base-class
 * promotions 2). There is no literal colour left in this file.
 */

export type DockTheme = {
	/* ── VS Code sash ── */
	/** Visible divider hairline (px). */
	divider: number;
	/** Invisible grab zone around the hairline (px, ≥ divider). */
	grab: number;
	/** Hover/drag accent bar width (px). */
	sash: number;
	/** Hover delay before the accent shows, so mousing across panes doesn't flicker (ms). */
	sashDelayMs: number;
	/**
	 * Divider drag clamp — no pane below this (px).
	 *
	 * ONE LABEL HEIGHT ([HUMAN] Sam, 2026-09-06): `tabHeight` plus the strip's
	 * own rule, so a pane can always be dragged back to just the row that
	 * names it and never below the label that gets it back. It was 90 — the
	 * signed artifact's number, and a floor sized for a pane holding a tree —
	 * which left a toolbar's pane two thirds empty with no way to reclaim it.
	 *
	 * It is the floor for BOTH axes. Sideways a pane this narrow is a sliver
	 * of strip, which is the same bargain: the drag is reversible, and a kit
	 * that refuses a size the reader asked for is the thing being complained
	 * about.
	 */
	minPane: number;

	/* ── tabs ── */
	/** Strip / group bar / stub height (px): 12px type + 7 top + 5 bottom + 2 underline. */
	tabHeight: number;
	/** Tab box rhythm — left/top/gap (px); spill zone is 3×pad. */
	pad: number;
	/** Trailing tab padding (px) — the × glyph's side-bearing makes 7px read
	 *  wider than it is, so 5px balances the ×↔separator↔next-char cluster. */
	padTight: number;
	/** Active-tab accent underline (px). */
	tabUnderline: number;
	/** Label ellipsis point (px). */
	tabMaxWidth: number;
	/** Status-light diameter (px). */
	tabDot: number;
	/** Status-light pulse period for `busy` (ms). */
	tabDotPulseMs: number;
	/** Tab letter-spacing (CSS length). `0` since titles went sentence case. */
	tabTracking: string;
	/** Strip insertion bar width (px). */
	insertWidth: number;
	/** Insertion bar offset on an empty strip (px). */
	insertFallback: number;
	/** Ghost opacity of the tab being dragged (0–1). */
	dragOpacity: number;

	/* ── context menu ── */
	/** Narrowest the menu may be (px). */
	menuMinWidth: number;
	/** Gap kept between the menu and the viewport edge when clamping (px). */
	menuMargin: number;

	/* ── content ── */
	/** Content scrollbar width (px). */
	scrollbar: number;
	/** Focus-visible outline width (px). */
	focusRing: number;

	/* ── floats ── */
	/** Shaded window width clamp — stage width minus this (px). */
	shadedClamp: number;
	/** Invisible edge resize-handle thickness (px). */
	floatEdge: number;
	/** Invisible corner resize-handle size (px). */
	floatCorner: number;
	/** How far the handles overhang the window edge (px). */
	floatEdgeOut: number;

	/* ── colors — every default is a --tool-* reference ── */
	/** Drop preview fill. */
	dropTint: string;
	/** Drop preview border. */
	dropBorder: string;
	/** Float elevation. */
	shadow: string;
	/** Topmost float elevation. */
	shadowFront: string;
	/** Content scrollbar thumb at rest. */
	scrollbarThumb: string;
	/** Content scrollbar thumb on content hover. */
	scrollbarThumbHover: string;

	/* ── stacking ── */
	zInsert: number;
	/** Spill fades/chevrons and float resize handles. */
	zSpill: number;
	zGrip: number;
	zDivider: number;
	/** First float; every raise takes the next z up. */
	zFloatBase: number;
	zPreview: number;
	zMenu: number;

	/* ── pointer math only — no CSS variable ── */
	/** Body drop zones: edge bands are this fraction of the pane, centre joins. */
	edgeBand: number;
	/** Root-split band — the outermost px of the stage (×2 with ⇧). */
	rootBand: number;
	/** Divider keyboard nudge (ratio). */
	ratioStep: number;
	/** Keyboard ratio clamp — ratio stays in [clamp, 1−clamp]. */
	ratioClamp: number;
	floatDefaultWidth: number;
	floatDefaultHeight: number;
	floatMinWidth: number;
	floatMinHeight: number;
	/** Drop offsets that put the dropped tab's title under the pointer. */
	floatGhostOffsetX: number;
	floatGhostOffsetY: number;
	/** Minimum gap kept between a placed float and the stage edge (px). */
	floatPlaceMargin: number;
	/** Move clamp — this much of a dragged window always stays on stage (px). */
	stageClampMarginX: number;
	stageClampMarginY: number;
};

export const DOCK_THEME: DockTheme = {
	divider: 1,
	grab: 9,
	sash: 3,
	sashDelayMs: 120,
	minPane: 27,
	tabHeight: 26,
	pad: 7,
	padTight: 5,
	tabUnderline: 2,
	tabMaxWidth: 160,
	tabDot: 8,
	tabDotPulseMs: 1200,
	tabTracking: "0",
	insertWidth: 2,
	insertFallback: 4,
	dragOpacity: 0.35,
	menuMinWidth: 180,
	menuMargin: 8,
	scrollbar: 4,
	focusRing: 2,
	shadedClamp: 8,
	floatEdge: 7,
	floatCorner: 11,
	floatEdgeOut: 3,
	dropTint: "color-mix(in srgb, var(--tool-accent) 28%, transparent)",
	dropBorder: "color-mix(in srgb, var(--tool-accent) 70%, transparent)",
	shadow: "var(--tool-shadow-1)",
	shadowFront: "var(--tool-shadow-2)",
	scrollbarThumb: "color-mix(in srgb, var(--tool-border) 55%, transparent)",
	scrollbarThumbHover: "var(--tool-border)",
	zInsert: 2,
	zSpill: 3,
	zGrip: 4,
	zDivider: 5,
	zFloatBase: 20,
	zPreview: 60,
	zMenu: 90,
	edgeBand: 0.3,
	rootBand: 12,
	ratioStep: 0.02,
	ratioClamp: 0.05,
	floatDefaultWidth: 340,
	floatDefaultHeight: 240,
	floatMinWidth: 180,
	floatMinHeight: 120,
	floatGhostOffsetX: 30,
	floatGhostOffsetY: 14,
	floatPlaceMargin: 4,
	stageClampMarginX: 40,
	stageClampMarginY: 30,
};

/** key → CSS variable + unit. Pointer-math-only knobs have no entry. */
const CSS_VARIABLES: readonly [keyof DockTheme, string, "px" | "ms" | "raw" | "number"][] = [
	["divider", "--dock-divider", "px"],
	["grab", "--dock-grab", "px"],
	["sash", "--dock-sash", "px"],
	["sashDelayMs", "--dock-sash-delay", "ms"],
	["minPane", "--dock-min-pane", "px"],
	["tabHeight", "--dock-tab-h", "px"],
	["pad", "--dock-pad", "px"],
	["padTight", "--dock-pad-tight", "px"],
	["tabUnderline", "--dock-tab-underline", "px"],
	["tabMaxWidth", "--dock-tab-max-w", "px"],
	["tabDot", "--dock-tab-dot", "px"],
	["tabDotPulseMs", "--dock-tab-dot-pulse", "ms"],
	["tabTracking", "--dock-tab-tracking", "raw"],
	["insertWidth", "--dock-insert-w", "px"],
	["menuMinWidth", "--dock-menu-min-w", "px"],
	["dragOpacity", "--dock-drag-opacity", "number"],
	["scrollbar", "--dock-scrollbar", "px"],
	["focusRing", "--dock-focus-ring", "px"],
	["shadedClamp", "--dock-shaded-clamp", "px"],
	["floatEdge", "--dock-float-edge", "px"],
	["floatCorner", "--dock-float-corner", "px"],
	["floatEdgeOut", "--dock-float-edge-out", "px"],
	["dropTint", "--dock-drop-tint", "raw"],
	["dropBorder", "--dock-drop-border", "raw"],
	["shadow", "--dock-shadow", "raw"],
	["shadowFront", "--dock-shadow-front", "raw"],
	["scrollbarThumb", "--dock-scrollbar-thumb", "raw"],
	["scrollbarThumbHover", "--dock-scrollbar-thumb-hover", "raw"],
	["zInsert", "--dock-z-insert", "number"],
	["zSpill", "--dock-z-spill", "number"],
	["zGrip", "--dock-z-grip", "number"],
	["zDivider", "--dock-z-divider", "number"],
	["zFloatBase", "--dock-z-float", "number"],
	["zPreview", "--dock-z-preview", "number"],
	["zMenu", "--dock-z-menu", "number"],
];

const APPLIED = new WeakMap<HTMLElement, DockTheme>();

/**
 * Write the theme's CSS variables onto one `.dock-stage` (merging over
 * whatever that stage already carries) and record the merged result for the
 * view's pointer math. Returns the merged theme.
 */
export const applyDockTheme = (stage: HTMLElement, partial?: Partial<DockTheme>): DockTheme => {
	const merged: DockTheme = { ...(APPLIED.get(stage) ?? DOCK_THEME), ...partial };
	APPLIED.set(stage, merged);
	for (const [key, variable, unit] of CSS_VARIABLES) {
		const value = merged[key];
		stage.style.setProperty(
			variable,
			unit === "px" ? `${value as number}px` : unit === "ms" ? `${value as number}ms` : String(value),
		);
	}
	return merged;
};

/** The theme currently applied to a stage (defaults before any apply). */
export const themeOf = (stage: HTMLElement): DockTheme => APPLIED.get(stage) ?? DOCK_THEME;
