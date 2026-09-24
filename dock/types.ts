/**
 * Dock kit model + port types — the signed design's data contract
 * (`docs/specs/2026-09-03-dock-kit-design.md` §Signed-off design / §Ports).
 *
 * The layout is a binary tree: split nodes carry a direction and ratio,
 * leaves carry an ordered tab list. Floats each hold a FULL tree of their
 * own, so docked and floating layouts share every structural op. The
 * serialized form carries tab ids only — the tab registry stays
 * consumer-owned.
 */

import type { Command, Keymap } from "@samthesomebody/kit/components";

/** Tab group. `collapsed` holds the global collapse sequence № (so "most
 *  recently collapsed" survives reload); `false`/absent = expanded. */
export type DockLeaf = {
	leaf: true;
	id: string;
	tabs: string[];
	/** Null only transiently while a leaf empties (it detaches right after). */
	active: string | null;
	collapsed?: number | false;
};

export type DockSplit = {
	split: "row" | "col";
	ratio: number;
	a: DockNode;
	b: DockNode;
};

export type DockNode = DockLeaf | DockSplit;

/** A floating window — geometry plus a full tree of its own. */
export type DockFloat = {
	id: string;
	x: number;
	y: number;
	w: number;
	h: number;
	z: number;
	root: DockNode;
};

/** The serialized layout: `{v, layout, floating}` — tab ids only. */
export type DockSerialized = {
	v: number;
	layout: DockNode | null;
	floating: DockFloat[];
	/**
	 * Focus mode: a DOCKED pane holding ONE tab renders with no tab bar at
	 * all — the treatment the root solo pane already had, applied to every
	 * such pane. A pane with two or more tabs keeps its bar, because there
	 * the bar is the only way to choose between them; a collapsed pane keeps
	 * it because there the bar IS the pane; a float keeps it because its
	 * strip carries the ⠿ grip that moves the window.
	 *
	 * Layout state, not a preference — it rides in the envelope so the
	 * consumer's existing persistence restores it with the tree. Absent
	 * (the old shape) reads as `false`, so a stored layout written before
	 * this existed hydrates unchanged.
	 */
	hideSingleTabBars?: boolean;
};

/** Body drop zones: 30% edge bands split, the centre joins. */
export type DockZone = "l" | "r" | "t" | "b" | "c";

/** Telemetry marks — every structural/interaction event the kit reports. */
export type DockMark =
	| "accordion"
	| "bars"
	| "collapse"
	| "external"
	| "float"
	| "join"
	| "overflow"
	| "redock"
	| "reorder"
	| "reset"
	| "resize"
	| "rootsplit"
	| "split"
	| "zmove";

/** In-flight drag payloads. `wasFloat` is stamped by payload resolution so
 *  landings can report a "redock". External content carries no source — it
 *  is minted into a tab by the consumer's `DockExternalPort` on drop. */
export type DockDragPayload =
	| { kind: "tab"; tab: string; source: string; wasFloat?: boolean }
	| { kind: "pane"; source: string; wasFloat?: boolean }
	| { kind: "tree"; node: DockNode; wasFloat?: boolean }
	| { kind: "ext"; wasFloat?: boolean };

/**
 * A tab's status light. Generic severity, not domain vocabulary — the kit
 * only maps it onto the palette (`busy` → accent and pulsing, `ok` →
 * success, `warn` → highlight, `danger` → danger).
 *
 * It exists because a tab title is a plain string and a consumer cannot
 * colour part of one: a pane of running jobs needs each tab to say whether
 * its job is alive, finished or failed, and that is chrome, which is the
 * kit's half of the bargain.
 */
export type DockTabStatus = "busy" | "ok" | "warn" | "danger";

/** One tab's definition. The kit owns chrome only: `render` receives the
 *  `.dock-content` element; `destroy` is called whenever that rendered
 *  content is torn down (full re-render or dock destroy). */
export type DockTabDef = {
	title: string;
	/** Status light before the label; absent renders no dot at all. */
	status?: DockTabStatus;
	/**
	 * Folder path for this tab under the menu's "Open" — `"Tools"` puts
	 * it in a Tools submenu. Absent leaves it at the top level. The tab's
	 * strip label is always `title`; this only groups the menu, so a pane of
	 * thirteen tools does not become thirteen top-level rows.
	 */
	menuPath?: string;
	render(element: HTMLElement): void;
	destroy?(): void;
	closable?: boolean;
	fit?: "cover";
};

/** id → def; the kit sees ids only. */
export type DockTabsPort = {
	get(id: string): DockTabDef | undefined;
	/**
	 * Every tab the consumer has, open or not. Optional: without it the kit
	 * cannot offer "open tab", because `get` alone can answer about an id but
	 * never enumerate them — so that menu entry is simply absent.
	 */
	list?(): readonly string[];
};

/** Where the menu was opened. All absent means the stage background. */
export type DockMenuContext = {
	/** Set only when the click landed ON a tab's strip entry. */
	tabId?: string;
	leafId?: string;
	/**
	 * The tab that leaf is SHOWING — set for a click anywhere in the pane,
	 * strip or body, and equal to `tabId` when the click was on the active
	 * tab. A consumer row about "this run" reads `tabId ?? activeTabId`: a
	 * right-click in a pane's body means its visible tab to everyone who
	 * tries it, and a pane with its single-tab bar hidden has no strip to
	 * aim at at all.
	 */
	activeTabId?: string;
};

/**
 * One row. The label is a **file-system style path** — `"Open/Tools/QA"`
 * — and the menu assembles the folders from it, so a caller hands over a flat
 * list and never builds nesting by hand. A path whose folder another item also
 * uses lands in the same submenu.
 */
export type DockMenuItem = {
	/** `/`-separated. Blank segments are ignored, so a stray slash is safe. */
	label: string;
	/**
	 * The accelerator column — one entry per KEY of the chord (`["Ctrl",
	 * "Alt", "B"]`), never one string: a menu row is the only place the kit
	 * teaches a keystroke, and `controls/menu.css` spells a shortcut as a
	 * sequence so chords line up down the column. A list rather than the
	 * control kit's markup string because the dock builds DOM, never HTML.
	 */
	hint?: readonly string[];
	run?(): void;
	disabled?: boolean;
	/** Draw a divider above this row (or above its folder). */
	separator?: boolean;
};

/**
 * Consumer rows for the context menu, appended below the kit's structural
 * ones. This is where a tool puts what only it knows — "save this layout as
 * my default", "reset" — without the kit learning about persistence.
 */
export type DockMenuPort = {
	items(context: DockMenuContext): DockMenuItem[];
};

export type DockEventsPort = {
	/** Any structural mutation — persistence hook. */
	change?(serialized: string): void;
	/** Telemetry seam. */
	event?(kind: DockMark): void;
	/** Toast seam; the kit renders nothing itself. */
	notify?(text: string): void;
};

/**
 * Foreign-content drops: `accepts` gates dragover, `mint` creates the tab on
 * drop and returns its id (registering it with the consumer's registry is
 * the consumer's business).
 *
 * The foreign SOURCE must set `effectAllowed` to a value that includes
 * `"copy"` — `"copyMove"` is the contract's word — because the kit answers
 * an external dragover with `dropEffect = "copy"`, and a browser silently
 * CANCELS a real drop whose dropEffect falls outside effectAllowed. Measured
 * both ways in the fidelity walk (`fidelity/FIDELITY.md`): `"copyMove"`
 * lands, `"move"` drops nothing and reports no error. Synthetic `DragEvent`s
 * never reproduce it, so nothing but a real drag can catch a regression here.
 */
export type DockExternalPort = {
	accepts(dataTransfer: DataTransfer): boolean;
	mint(dataTransfer: DataTransfer): string;
};

export type DockPorts = {
	tabs: DockTabsPort;
	/**
	 * Rebinds, merged over the kit's own `DOCK_KEYMAP` — `{ "dock.toggleTabBars":
	 * "mod+k" }` moves that one chord and leaves the rest alone. This is the
	 * whole binding surface: the commands themselves carry no keys, and the
	 * menu's accelerator column is drawn from whatever this table ends up
	 * saying, so a rebind re-labels itself.
	 */
	keymap?: Keymap;
	/** Serialized layout to hydrate. */
	state?: string;
	on?: DockEventsPort;
	external?: DockExternalPort;
	menu?: DockMenuPort;
};

export type DockOpenOptions = {
	/** Leaf to join; defaults to the first leaf of the docked tree. */
	leafId?: string;
};

export type DockHandle = {
	/**
	 * Everything the kit can do, as data. Reach a command from a toolbar
	 * button, a command palette or a test without going near a keyboard —
	 * `commands.find((c) => c.id === "dock.toggleTabBars")?.run()`.
	 */
	commands: readonly Command[];
	serialize(): string;
	hydrate(json: string): void;
	openTab(id: string, options?: DockOpenOptions): void;
	closeTab(id: string): void;
	destroy(): void;
};
