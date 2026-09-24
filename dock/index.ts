/**
 * dock — generic window / tab / split manager
 * (`docs/specs/2026-09-03-dock-kit-design.md`, a 1:1 port of the signed
 * design artifact). Framework-agnostic TypeScript + DOM: nested resizable
 * splits, tab groups per pane, five-zone tab drag-and-drop, floating windows
 * that are themselves full split trees, recursive collapse with structural
 * group bars. Event-driven only — no rAF, ever.
 */

/* The control kit's stylesheet rides in with the dock: the dock's own menu
   IS a kit menu, and the surface recipe it wears (`--surface-*`) is declared
   in `controls.css`. A `var()` that resolves to nothing is an invalid
   declaration the browser drops in silence, so this is not optional. */
/* The control kit's drawing. It used to arrive as a side effect of the
   package index; that import was removed 2026-09-05 so the kit's RULES could
   be imported without dragging a stylesheet into a game bundle, and the
   consumers that want the CSS now ask for it by name. */
import "@samthesomebody/kit/components/index.css";
import "./dock.css";

export { createDock, DOCK_EXTERNAL_MIME } from "./view";
export { DOCK_COMMANDS, DOCK_KEYMAP } from "./commands";
export { closeDockMenu } from "./menu";
export { applyDockTheme, DOCK_THEME, themeOf } from "./theme";
export type { DockTheme } from "./theme";
export type {
	DockEventsPort,
	DockExternalPort,
	DockFloat,
	DockHandle,
	DockLeaf,
	DockMark,
	DockMenuContext,
	DockMenuItem,
	DockMenuPort,
	DockNode,
	DockOpenOptions,
	DockPorts,
	DockSerialized,
	DockSplit,
	DockTabDef,
	DockTabsPort,
	DockTabStatus,
	DockZone,
} from "./types";

/* The escape hatch for content a re-parent would destroy — an iframe, a
   <video>, a scroll position (`slot.ts`). */
export { followSlot } from "./slot";
export type { SlotFollower, SlotRect } from "./slot";
