/* The menu's rules: what a chain is, where a level goes, and which
 * right-clicks the pane may take.
 *
 * A CHAIN, not a menu. Every open level is held in one list, outermost
 * first, so closing a level closes everything under it and opening a sibling
 * row closes what the last one opened. The split button used to build its
 * own menu outside that list, which `closeMenu` then could not see: every
 * press left the last one behind and nothing could dismiss them.
 */

export type MenuItem =
	| { rule: true }
	| {
			rule?: false;
			label: string;
			/* a hint is markup — a `kbd` per key, a gesture its own element */
			hint?: string;
			tick?: boolean;
			on?: boolean;
			disabled?: boolean;
			submenu?: MenuItem[];
			action?: () => void;
	  };

export type MenuRow = Exclude<MenuItem, { rule: true }>;

export const isRule = (item: MenuItem): item is { rule: true } => "rule" in item && item.rule === true;

/* The tick gutter is reserved ONLY when a menu has something ticked, which
   most context menus do not. Reserving it on every row is what made menus
   read padded next to everything else in the kit. */
export const hasTicks = (items: MenuItem[]): boolean => items.some((item) => !isRule(item) && item.tick === true);

export const rows = (items: MenuItem[]): MenuRow[] => items.filter((item): item is MenuRow => !isRule(item));

/* Keyboard movement wraps, and skips what cannot be chosen.
   Indices are into `items` — rules included — because that is what the view
   iterates. Counting only the rows gave a number that pointed at a different
   line the moment a menu had a rule in it. */
export const rowForKey = (items: MenuItem[], at: number, key: string): number | undefined => {
	const usable = items.map((item, index) => ({ item, index })).filter(({ item }) => !isRule(item) && !item.disabled);
	if (usable.length === 0) {
		return undefined;
	}
	const here = usable.findIndex(({ index }) => index === at);
	if (key === "Home") {
		return usable[0]?.index;
	}
	if (key === "End") {
		return usable[usable.length - 1]?.index;
	}
	if (key === "ArrowDown") {
		return usable[(here + 1) % usable.length]?.index;
	}
	if (key === "ArrowUp") {
		return usable[(here - 1 + usable.length) % usable.length]?.index;
	}
	return undefined;
};

export type Box = {
	width: number;
	height: number;
};
export type Viewport = {
	width: number;
	height: number;
};

/* Kept on screen with the dock's own margin. */
export const placeMenu = (
	x: number,
	y: number,
	box: Box,
	viewport: Viewport,
	margin: number,
): { x: number; y: number } => ({
	x: Math.max(margin, Math.min(x, viewport.width - box.width - margin)),
	y: Math.max(margin, Math.min(y, viewport.height - box.height - margin)),
});

/* A submenu BUTTS AGAINST its parent — no gap — because a gap is a place the
   pointer can leave the chain by accident, which is the single thing that
   makes cascading menus feel broken. It flips to the parent's leading edge
   when there is no room, and aligns with its own row's top edge exactly,
   which the menu's zero vertical padding makes possible without a fudge. */
export const placeSubmenu = (
	parent: { left: number; right: number },
	rowTop: number,
	box: Box,
	viewport: Viewport,
	margin: number,
): { x: number; y: number } => {
	const x = parent.right + box.width > viewport.width - margin ? parent.left - box.width : parent.right;
	return placeMenu(x, rowTop, box, viewport, margin);
};

/* WHICH RIGHT-CLICKS THE PANE MAY TAKE.
 *
 * The dock menu owns chrome; the native menu owns text. Chrome has no escape
 * hatch once a page calls `preventDefault`, so eating Copy / Paste / Select
 * all / spellcheck to show four rows of pane chrome is a bad trade.
 *
 * "Text" means a field you can TYPE INTO — not every input. A range and a
 * checkbox are controls, and matching them here meant a right-click on a
 * slider fell through to the browser and never reached the pane's own menu.
 *
 * Shift+right-click always passes: Firefox forces it regardless, and
 * honouring it in Chromium too means a user is never trapped without Copy.
 */
const TYPED = /^(?:text|number|search|email|url|password|tel)$/;

/**
 * Is this element somewhere a person TYPES? The right-click rule above needs
 * it, and so does every keyboard shortcut a surface binds — a chord that
 * fires while a caret is in a field is a chord that eats someone's keystroke.
 * One predicate rather than two spellings of it, because the two would drift.
 */
export const isTypingTarget = (target: Element): boolean => {
	/* `closest("input")` can only match an <input>, so the cast is the same
	   proof `instanceof HTMLInputElement` was making — and it does not need
	   the global, which is absent outside a browser and THROWS when named
	   rather than yielding false. */
	const input = target.closest("input") as HTMLInputElement | null;
	if (input !== null && TYPED.test(input.type)) {
		return true;
	}
	return target.closest("textarea, [contenteditable]") !== null;
};

export const shouldOpenPaneMenu = (event: {
	shiftKey: boolean;
	target: Element;
	selectionLength: number;
	armed: boolean;
}): boolean => {
	if (event.armed || event.shiftKey) {
		return false;
	}
	if (isTypingTarget(event.target)) {
		return false;
	}
	return event.selectionLength === 0;
};
