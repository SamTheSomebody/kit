/* THE CONTROL KIT'S CORE: the rules every control is made of, apart from
 * the markup that draws them. Framework-free and CSS-free by design, so a
 * plain-DOM panel (a game's dev overlay, a dock tab mounted by hand) can use
 * the same rules as the Svelte components without loading either.
 *
 * Every rule here had a bug in the original artifact that a unit test would
 * have caught, which is why they are separated from the markup at all.
 * Design history: game-mono `docs/specs/2026-09-04-control-kit-design.md`.
 */

/* THE STYLESHEET IS NOT IMPORTED HERE, and that is deliberate as of
   2026-09-05. An unconditional `import "./index.css"` on this index made the
   package's LOGIC unreachable to anything that must not ship 28 kB of tool CSS
   — measured on a clean king-of-gods production build, where importing one
   constant from here took the game's CSS from 17,928 to 46,452 bytes, because
   a side-effect import is one Rollup will not drop however unused the bindings
   are. A game's plain-DOM dev panels are exactly that case: reached
   statically from code every game imports.

   So the rules are importable on their own and a consumer that wants the
   drawing asks for it: `import "./index.css"`. The kit's own Svelte
   components already did this per control (`import "./button.css"`),
   so this only changes the two consumers that were leaning on the index. */

export { GESTURES, GLYPHS, SPRITES, glyphCharacters, isToggle } from "./icons";
export type { IconName } from "./icons";
export { ICON_SPRITE } from "./sprite";
export { bindToggle, crossedTo, paints, stroke } from "./paint";
export type { PressGesture, Stroke, ToggleTarget } from "./paint";
export {
	hasTicks,
	hintParts,
	isRule,
	isTypingTarget,
	placeMenu,
	placeSubmenu,
	rowForKey as menuRowForKey,
	rows as menuRows,
	shouldOpenPaneMenu,
} from "./menu";
export type { Box, MenuItem, MenuRow, Viewport } from "./menu";
export {
	bindKeymap,
	chordKeys,
	commandHint,
	isApplePlatform,
	matchesChord,
	parseChord,
	resolveCommand,
} from "./keymap";
export type { BindKeymapOptions, Chord, ChordEvent, Command, Keymap } from "./keymap";
export { bindScroll, scrollFromRail, scrollState, withinReach } from "./scroll";
export type { BoundScroll, ScrollMetrics, ScrollState } from "./scroll";
export { bindScrub, PIXELS_PER_STEP, SCRUB_TIP, scrubMagnitude, scrubText, stepText } from "./scrub";
export type { ScrubPorts } from "./scrub";
export {
	commitSlider,
	dualSet,
	dualShift,
	knobStep,
	nearerKnob,
	resetSliderRange,
	reseedSlider,
	sameSliderBounds,
	sliderDigits,
	sliderFill,
	syncSlider,
} from "./slider";
export type { DualRange, SliderBounds, SliderRange } from "./slider";
export { nextSort, sortRows } from "./sort";
export type { SortDirection, SortState } from "./sort";
export {
	ancestorIds,
	branchIds,
	branchRows,
	descendantIds,
	filterTree,
	dropSide,
	foldAll,
	foldBranch,
	foldsBranch,
	leafIds,
	markCount,
	markState,
	moveNode,
	nodeCount,
	rowForKey as treeRowForKey,
	setMark,
	treeNodeMatches,
	visibleRows,
} from "./tree";
export type { BranchRow, FoldGesture, MarkState, TreeBadge, TreeNode, TreeRow } from "./tree";
export { createRegistry } from "./registry";
export type { Registry } from "./registry";
/* Types only: the registry of editors itself imports the editor components,
 * so it has its own entry, `@samthesomebody/kit/editors`, and this index
 * stays free of Svelte and CSS. */
export type {
	BooleanProperty,
	BuiltInProperty,
	ColorProperty,
	EditorDefinition,
	EditorProps,
	EnumProperty,
	NumberProperty,
	Property,
	StringProperty,
	VectorProperty,
} from "./editors";
