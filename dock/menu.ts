/**
 * Dock context menu — the kit's own, because no browser lets a page add rows
 * to the native one (Firefox's `<menu type="context">` was removed and Chrome
 * never shipped it). Right-click is where people look for "what can I do with
 * this", and it costs no pixels until asked: everything structural lives here
 * rather than as chrome cluttering the stage.
 *
 * Callers hand over a FLAT list whose labels are file-system style paths
 * (`"Open/Tools/QA"`); the folders are assembled here. That keeps the
 * contributing side declarative — a consumer adding thirteen tools writes
 * thirteen paths, not a nested structure — and lets separate contributors land
 * in the same submenu just by naming it.
 *
 * DOM only, no framework, no rAF — the same rules as the rest of the kit.
 */

import { themeOf } from "./theme";
import type { DockMenuItem } from "./types";

type OpenMenu = {
	close(): void;
};

let openMenu: OpenMenu | null = null;

/** Close whatever menu is open; safe when none is. */
export const closeDockMenu = (): void => {
	openMenu?.close();
	openMenu = null;
};

type MenuNode = {
	label: string;
	item?: DockMenuItem;
	children: Map<string, MenuNode>;
};

/** Split every label on `/` and grow the folder tree, in first-seen order. */
const buildTree = (items: readonly DockMenuItem[]): MenuNode => {
	const root: MenuNode = { label: "", children: new Map() };
	for (const item of items) {
		const parts = item.label
			.split("/")
			.map((part) => part.trim())
			.filter((part) => part.length > 0);
		if (parts.length === 0) {
			continue;
		}
		let node = root;
		for (const part of parts) {
			let next = node.children.get(part);
			if (!next) {
				next = { label: part, children: new Map() };
				node.children.set(part, next);
			}
			node = next;
		}
		/* the deepest segment carries the action; a folder an item also names
		   in its own right (a disabled "Open", say) keeps that item */
		node.item = item;
	}
	return root;
};

const isActionable = (node: MenuNode): boolean =>
	!node.item?.disabled && (node.children.size > 0 || Boolean(node.item?.run));

/**
 * Open a menu at viewport point (x, y). Returns nothing: the menu owns its own
 * dismissal — Escape, a click anywhere outside, a scroll, or running a row.
 */
export const openDockMenu = (stage: HTMLElement, items: readonly DockMenuItem[], x: number, y: number): void => {
	closeDockMenu();
	const tree = buildTree(items);
	if (tree.children.size === 0) {
		return;
	}
	const theme = themeOf(stage);

	/* One open panel per depth, so walking down a branch never leaves the
	   panels above it stranded. */
	const trail: HTMLElement[] = [];
	const closeBelow = (depth: number): void => {
		while (trail.length > depth) {
			trail.pop()?.remove();
		}
	};

	const panelFor = (node: MenuNode, depth: number): HTMLElement => {
		const panel = document.createElement("div");
		/* THE KIT'S MENU, not a second one. `.kit-menu` carries the rules
		   (`controls/menu.css`) and `data-dev` keeps every automation selector
		   the dock already published. Two class names for one object was the
		   thing that let the two drift; there is one now. */
		panel.className = depth === 0 ? "kit-menu floating" : "kit-menu floating kit-menu-sub";
		panel.dataset.dev = "dock-menu";
		panel.setAttribute("role", "menu");
		panel.tabIndex = -1;

		const rows: HTMLElement[] = [];
		for (const child of node.children.values()) {
			/* A rule above the FIRST row is a rule against the panel's own top
			   edge — a line with nothing on the far side of it. Rows that ask
			   for one land first often now that most of them live in folders,
			   so the panel decides rather than every caller. */
			if (child.item?.separator && panel.childElementCount > 0) {
				const rule = document.createElement("div");
				rule.className = "kit-menu-rule";
				panel.append(rule);
			}
			const row = document.createElement("button");
			row.type = "button";
			row.className = "kit-menu-item";
			row.setAttribute("role", "menuitem");
			row.dataset.dev = "dock-menu-item";
			row.disabled = !isActionable(child);
			row.append(document.createTextNode(child.label));

			/* The accelerator column (`controls/menu.css` .kit-menu-hint): a
			   `kbd` per key, so `Ctrl Alt B` reads as a sequence and lines up
			   with every other chord down the column instead of as one
			   squashed token. A folder never carries one — its caret owns
			   that end of the row. */
			if (child.item?.hint && child.item.hint.length > 0 && child.children.size === 0) {
				const hint = document.createElement("span");
				hint.className = "kit-menu-hint";
				for (const key of child.item.hint) {
					const kbd = document.createElement("kbd");
					kbd.textContent = key;
					hint.append(kbd);
				}
				row.append(hint);
			}

			if (child.children.size > 0) {
				const caret = document.createElement("span");
				caret.className = "kit-menu-caret";
				caret.textContent = "▸";
				row.append(caret);
				const openChild = (): void => {
					if (row.disabled) {
						return;
					}
					closeBelow(depth + 1);
					const box = row.getBoundingClientRect();
					const sub = panelFor(child, depth + 1);
					stage.append(sub);
					trail[depth + 1] = sub;
					place(sub, box.right, box.top, theme.menuMargin);
				};
				row.addEventListener("pointerenter", openChild);
				row.addEventListener("click", openChild);
				row.addEventListener("focus", openChild);
			} else {
				row.addEventListener("pointerenter", () => closeBelow(depth + 1));
				row.addEventListener("click", () => {
					closeDockMenu();
					child.item?.run?.();
				});
			}
			rows.push(row);
			panel.append(row);
		}

		panel.addEventListener("keydown", (event) => {
			const usable = rows.filter((row) => !(row as HTMLButtonElement).disabled);
			if (event.key === "Escape") {
				event.stopPropagation();
				closeDockMenu();
				return;
			}
			if (event.key === "ArrowLeft" && depth > 0) {
				event.preventDefault();
				closeBelow(depth);
				trail[depth - 1]?.focus();
				return;
			}
			if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
				return;
			}
			event.preventDefault();
			const at = usable.indexOf(document.activeElement as HTMLElement);
			const step = event.key === "ArrowDown" ? 1 : -1;
			const to = at === -1 ? 0 : (at + step + usable.length) % usable.length;
			usable[to]?.focus();
		});
		return panel;
	};

	/* Under the STAGE, never `document.body`: `applyDockTheme` writes the
	   `--dock-*` variables per stage, so a menu parented elsewhere inherits
	   none of them and renders with no padding, no width and no shadow. It
	   stays `position: fixed`, so placement is still viewport maths. */
	const root = panelFor(tree, 0);
	stage.append(root);
	trail[0] = root;
	place(root, x, y, theme.menuMargin);
	root.querySelector<HTMLElement>(".kit-menu-item:not(:disabled)")?.focus();

	const onPointerDown = (event: PointerEvent): void => {
		const target = event.target as Node | null;
		if (target && trail.some((panel) => panel?.contains(target))) {
			return;
		}
		closeDockMenu();
	};
	const onLeave = (): void => closeDockMenu();
	document.addEventListener("pointerdown", onPointerDown, true);
	window.addEventListener("scroll", onLeave, true);
	window.addEventListener("resize", onLeave);
	window.addEventListener("blur", onLeave);

	openMenu = {
		close: () => {
			document.removeEventListener("pointerdown", onPointerDown, true);
			window.removeEventListener("scroll", onLeave, true);
			window.removeEventListener("resize", onLeave);
			window.removeEventListener("blur", onLeave);
			closeBelow(0);
		},
	};
};

/** Put the panel at (x, y), flipped back inside the viewport when it would spill. */
const place = (panel: HTMLElement, x: number, y: number, margin: number): void => {
	panel.style.left = "0px";
	panel.style.top = "0px";
	const box = panel.getBoundingClientRect();
	const left = Math.max(margin, Math.min(x, window.innerWidth - box.width - margin));
	const top = Math.max(margin, Math.min(y, window.innerHeight - box.height - margin));
	panel.style.left = `${left}px`;
	panel.style.top = `${top}px`;
};
