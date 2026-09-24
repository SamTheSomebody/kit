/**
 * Dock kit view — the signed artifact's render + interaction code (§3–§7),
 * transcribed 1:1: full `rerender()`, HTML5 drag-and-drop, pointer-captured
 * dividers and float move/resize. Event-driven only — no rAF, ever; CSS
 * transitions are the only motion and `prefers-reduced-motion` kills those
 * (agent browser panes throttle rAF *and* timers; the kit stays interactive
 * there).
 *
 * The demo shell's inspector/toast/telemetry chrome is the typed
 * `DockEventsPort`: `change` fires on any structural mutation (persistence),
 * `event` is the artifact's `mark()`, `notify` its `toast()` — the kit
 * renders no feedback chrome itself.
 */

import { bindKeymap, bindScroll, commandHint, shouldOpenPaneMenu, type BoundScroll, type Command } from "@samthesomebody/kit/components";

import { DOCK_COMMANDS, DOCK_KEYMAP } from "./commands";
import { dropDecision, rootBandPx, rootZoneAt } from "./dropZone";
import { closeDockMenu, openDockMenu } from "./menu";
import { applyDockTheme, themeOf } from "./theme";
import {
	createDockCore,
	eachLeafOf,
	isBareLeaf,
	isCollapsedTree,
	lastCollapsedOf,
	mergesAsGroup,
	type DockCore,
	type MintTab,
} from "./tree";
import type {
	DockDragPayload,
	DockFloat,
	DockHandle,
	DockLeaf,
	DockMenuContext,
	DockMenuItem,
	DockNode,
	DockOpenOptions,
	DockPorts,
	DockSplit,
	DockTabDef,
	DockTabStatus,
	DockZone,
} from "./types";

/** The external payload MIME — foreign sources set it with `effectAllowed:
 *  "copyMove"` (a dropEffect outside effectAllowed cancels real drops). */
export const DOCK_EXTERNAL_MIME = "application/x-dock-external";

type DropWiring = {
	/** Root band needs ⇧ over precise join targets (strips/bars). */
	shiftRoot?: boolean;
	over(event: DragEvent, drag: DockDragPayload): void;
	leave?(): void;
	drop(event: DragEvent, drag: DockDragPayload): void;
};

type DockAutomation = {
	serialize(): string;
	hydrate(json: string): void;
	state(): unknown;
	openTab(id: string, options?: DockOpenOptions): void;
	closeTab(id: string): void;
};

type TabOffset = { readonly offsetLeft: number; readonly offsetWidth: number };

/** Where the insert bar sits: the target tab's left edge, or just past the last one. */
export const insertOffset = (tabs: ArrayLike<TabOffset>, index: number, fallback: number): number => {
	if (index < tabs.length) {
		return tabs[index]!.offsetLeft;
	}
	const last = tabs[tabs.length - 1];
	if (last) {
		return last.offsetLeft + last.offsetWidth;
	}
	return fallback;
};

export const createDock = (stage: HTMLElement, ports: DockPorts): DockHandle => {
	stage.classList.add("dock-stage");
	applyDockTheme(stage);

	const emitChange = (): void => ports.on?.change?.(core.serialize());
	/* Every restore is pruned against the registry — a stored layout outlives
	   the tabs it names (a run the server forgot, a tool dropped from the
	   registry), and an id nobody can render must not keep holding a pane. */
	const knownTab = (id: string): boolean => ports.tabs.get(id) !== undefined;
	const core: DockCore = createDockCore(
		{ mark: (kind) => ports.on?.event?.(kind), notify: (text) => ports.on?.notify?.(text) },
		themeOf(stage).zFloatBase,
	);

	const rootElement = document.createElement("div");
	rootElement.className = "dock-root";
	stage.append(rootElement);
	const preview = document.createElement("div");
	preview.className = "dock-drop-preview";
	stage.append(preview);
	const insertBar = document.createElement("div");
	insertBar.className = "dock-insert";

	/* element ↔ model links, rebuilt every render */
	const dividerNodes = new WeakMap<Element, DockSplit>();

	/* consumer content mounted this render — torn down before the next */
	let mountedTabs: DockTabDef[] = [];
	/* one drawn rail per pane body this render — same lifetime as the content
	   it measures, and unbound with it: the rail listens on the window, so a
	   render that dropped its element without this would leak a listener per
	   pane per render */
	let mountedRails: BoundScroll[] = [];
	const unmountContent = (): void => {
		for (const def of mountedTabs) {
			def.destroy?.();
		}
		mountedTabs = [];
		for (const rail of mountedRails) {
			rail.destroy();
		}
		mountedRails = [];
	};

	/* ══ drag session ═══════════════════════════════════════════════════ */
	let DRAG: DockDragPayload | null = null;
	const dragCleanup = (): void => {
		DRAG = null;
		hidePreview();
		insertBar.remove();
		document.body.classList.remove("tab-drag");
		stage.querySelectorAll(".dragging").forEach((tab) => tab.classList.remove("dragging"));
	};

	/** The in-flight payload: an internal drag, or a foreign one the
	 *  consumer's external port accepts. */
	const dragOf = (event: DragEvent): DockDragPayload | null => {
		if (DRAG) {
			return DRAG;
		}
		const dataTransfer = event.dataTransfer;
		if (dataTransfer && ports.external?.accepts(dataTransfer)) {
			/* external sessions have no dragstart of ours — take the divider
			   shield here so drops near a sash still reach the panes */
			document.body.classList.add("tab-drag");
			return { kind: "ext" };
		}
		return null;
	};

	const mintOf = (event: DragEvent): MintTab | undefined => {
		const dataTransfer = event.dataTransfer;
		if (!dataTransfer || !ports.external) {
			return undefined;
		}
		const external = ports.external;
		return () => external.mint(dataTransfer);
	};

	/* Every drag source sets the payload on dragstart. The e.target gate
	   lets nested sources (a tab inside a strip, a bar tab inside a cell)
	   run their own drags — dragstart fires at the innermost draggable. */
	const wireDragSource = (element: HTMLElement, make: () => DockDragPayload): void => {
		element.draggable = true;
		element.addEventListener("dragstart", (event) => {
			if (event.target !== element) {
				return;
			}
			DRAG = make();
			const label = DRAG.kind === "tab" ? DRAG.tab : DRAG.kind === "pane" ? DRAG.source : "";
			event.dataTransfer?.setData(`application/x-dock-${DRAG.kind}`, label);
			if (event.dataTransfer) {
				event.dataTransfer.effectAllowed = "move";
			}
			document.body.classList.add("tab-drag");
			element.classList.add("dragging");
		});
		element.addEventListener("dragend", dragCleanup);
	};

	/* Every drop target shares one skeleton, in precedence order: root band
	   (⇧-gated on strips via shiftRoot) → ⇧-float → the target's own zone. */
	const wireDropTarget = (element: HTMLElement, wiring: DropWiring): void => {
		element.addEventListener("dragover", (event) => {
			const drag = dragOf(event);
			if (!drag) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			if (event.dataTransfer) {
				event.dataTransfer.dropEffect = drag.kind === "ext" ? "copy" : "move";
			}
			const decided = decideDrop(event, wiring.shiftRoot);
			insertBar.remove();
			if (decided.land === "root") {
				return showPreview(stage, decided.zone);
			} /* root edge */
			if (decided.land === "float") {
				return showFloatGhost(event);
			} /* ⇧ = force float */
			wiring.over(event, drag);
		});
		element.addEventListener("dragleave", (event) => {
			if (event.target !== element) {
				return;
			}
			hidePreview();
			insertBar.remove();
			wiring.leave?.();
		});
		element.addEventListener("drop", (event) => {
			const drag = dragOf(event);
			if (!drag) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			const decided = decideDrop(event, wiring.shiftRoot);
			if (decided.land === "root") {
				return landOnRoot(decided.zone, drag, mintOf(event));
			}
			if (decided.land === "float") {
				return landAsFloat(event, drag);
			}
			wiring.drop(event, drag);
		});
	};

	/* ══ zones + indicators ═════════════════════════════════════════════ */

	/** 5 zones on a body: edge bands split, the centre joins. */
	const zoneOf = (element: HTMLElement, event: DragEvent): DockZone => {
		const band = themeOf(stage).edgeBand;
		const rect = element.getBoundingClientRect();
		const x = (event.clientX - rect.left) / rect.width;
		const y = (event.clientY - rect.top) / rect.height;
		if (x > band && x < 1 - band && y > band && y < 1 - band) {
			return "c";
		}
		const left = x,
			right = 1 - x,
			top = y,
			bottom = 1 - y;
		const nearest = Math.min(left, right, top, bottom);
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

	/* The outermost band of the stage splits at the ROOT — wins over pane
	   zones and over ⇧-float. ⇧ doubles the hit region. */
	const rootZone = (event: DragEvent): Exclude<DockZone, "c"> | null => {
		if (!core.state.layout) {
			return null;
		}
		return rootZoneAt(
			event.clientX,
			event.clientY,
			stage.getBoundingClientRect(),
			rootBandPx(themeOf(stage).rootBand, event.shiftKey),
		);
	};

	const decideDrop = (event: DragEvent, shiftRoot?: boolean) =>
		dropDecision({ shiftRoot, shiftKey: event.shiftKey, rootZone: rootZone(event) });

	const showPreview = (over: HTMLElement, zone: DockZone): void => {
		const rect = over.getBoundingClientRect();
		const half = { w: rect.width / 2, h: rect.height / 2 };
		/* keyed, not a ladder: indexing by DockZone makes a new zone a compile error */
		const box = {
			c: { l: rect.left, t: rect.top, w: rect.width, h: rect.height },
			l: { l: rect.left, t: rect.top, w: half.w, h: rect.height },
			r: { l: rect.left + half.w, t: rect.top, w: half.w, h: rect.height },
			t: { l: rect.left, t: rect.top, w: rect.width, h: half.h },
			b: { l: rect.left, t: rect.top + half.h, w: rect.width, h: half.h },
		}[zone];
		paintPreview(box.l, box.t, box.w, box.h);
	};

	/** Eases between zones; snaps on first show so it never flies in. */
	const paintPreview = (left: number, top: number, width: number, height: number): void => {
		const wasHidden = preview.style.display !== "block";
		if (wasHidden) {
			preview.style.transition = "none";
		}
		preview.style.display = "block";
		preview.style.left = `${left}px`;
		preview.style.top = `${top}px`;
		preview.style.width = `${width}px`;
		preview.style.height = `${height}px`;
		if (wasHidden) {
			preview.getBoundingClientRect();
			preview.style.transition = "";
		}
	};
	const hidePreview = (): void => {
		preview.style.display = "none";
	};

	const stripIndex = (strip: HTMLElement, clientX: number): number => {
		const tabs = [...strip.querySelectorAll(".dock-tab")];
		for (let at = 0; at < tabs.length; at += 1) {
			const rect = tabs[at]!.getBoundingClientRect();
			if (clientX < rect.left + rect.width / 2) {
				return at;
			}
		}
		return tabs.length;
	};

	/* ══ landings — resolve through the core, then repaint ══════════════ */

	const landOnStrip = (leaf: DockLeaf, index: number, drag: DockDragPayload, mintTab?: MintTab): void => {
		const changed = core.dropOnStrip(leaf, index, drag, mintTab);
		dragCleanup();
		if (changed) {
			rerender();
		}
	};
	const landOnBody = (leaf: DockLeaf, zone: DockZone, drag: DockDragPayload, mintTab?: MintTab): void => {
		const changed = core.dropOnBody(leaf, zone, drag, mintTab);
		dragCleanup();
		if (changed) {
			rerender();
		}
	};
	const landOnRoot = (zone: Exclude<DockZone, "c">, drag: DockDragPayload, mintTab?: MintTab): void => {
		const changed = core.dropOnRoot(zone, drag, mintTab);
		dragCleanup();
		if (changed) {
			rerender();
		}
	};
	const landAsFloat = (event: DragEvent, drag: DockDragPayload): void => {
		const theme = themeOf(stage);
		const at = floatPlace(event);
		const changed = core.dropAsFloat(
			at.x,
			at.y,
			theme.floatDefaultWidth,
			theme.floatDefaultHeight,
			drag,
			mintOf(event),
		);
		dragCleanup();
		if (changed) {
			rerender();
		}
	};

	/** Offsets put the dropped tab's title under the pointer (≈ mid-tab). */
	const floatPlace = (event: DragEvent): { x: number; y: number } => {
		const theme = themeOf(stage);
		const rect = stage.getBoundingClientRect();
		const clampX = rect.width - (theme.floatDefaultWidth + theme.floatPlaceMargin);
		const clampY = rect.height - (theme.floatDefaultHeight + theme.floatPlaceMargin);
		return {
			x: Math.max(
				theme.floatPlaceMargin,
				Math.min(Math.round(event.clientX - rect.left - theme.floatGhostOffsetX), clampX),
			),
			y: Math.max(
				theme.floatPlaceMargin,
				Math.min(Math.round(event.clientY - rect.top - theme.floatGhostOffsetY), clampY),
			),
		};
	};

	/** Window-sized ghost at the pointer. */
	const showFloatGhost = (event: DragEvent): void => {
		const theme = themeOf(stage);
		const rect = stage.getBoundingClientRect();
		const at = floatPlace(event);
		paintPreview(rect.left + at.x, rect.top + at.y, theme.floatDefaultWidth, theme.floatDefaultHeight);
	};

	/* ══ context menu ═══════════════════════════════════════════════════
	   Everything structural lives behind right-click: it costs no pixels
	   until asked, which is the only way a kit this capable stays out of the
	   way. No browser lets a page add rows to the NATIVE menu, so this is our
	   own panel over a prevented default. */

	const openTabIds = (): Set<string> => {
		const open = new Set<string>();
		core.eachLeaf((leaf) => leaf.tabs.forEach((id) => open.add(id)));
		return open;
	};

	const leafOfElement = (element: Element | null): DockLeaf | null => {
		const host = element?.closest<HTMLElement>(".dock-leaf");
		const id = host?.dataset.leaf;
		return id ? core.findLeaf(id) : null;
	};

	/** Tabs the consumer has that sit in no pane — the reopen list. Each tab's
	 *  own `menuPath` decides the folder it lands in, so thirteen tools become
	 *  one "Tools" submenu rather than thirteen rows. */
	const unopenedItems = (target: DockLeaf | null): DockMenuItem[] => {
		const all = ports.tabs.list?.();
		if (!all) {
			return [];
		}
		const open = openTabIds();
		const closed = all.filter((id) => !open.has(id));
		if (closed.length === 0) {
			return [{ label: "Open", separator: true, disabled: true }];
		}
		return closed.map((id, at) => {
			const definition = ports.tabs.get(id);
			const folder = definition?.menuPath ? `/${definition.menuPath}` : "";
			return {
				label: `Open${folder}/${definition?.title ?? id}`,
				separator: at === 0,
				run: () => openTab(id, target ? { leafId: target.id } : undefined),
			};
		});
	};

	/* ══ commands ═══════════════════════════════════════════════════════
	   What the kit can DO, with no key anywhere in it. The chords live in
	   `commands.ts` as a table the consumer can replace entry by entry
	   (`ports.keymap`), and the menu row's accelerator is read back out of
	   that same table — so a rebind re-labels itself and nothing here has
	   an opinion about which keys are free. */

	const toggleTabBars = (): void => {
		const hiding = core.state.hideSingleTabBars !== true;
		core.state.hideSingleTabBars = hiding;
		ports.on?.event?.("bars");
		ports.on?.notify?.(hiding ? "single-tab bars hidden" : "single-tab bars shown");
		rerender(); /* rerender emits the change, so the toggle persists with the tree */
	};

	/* ══ the pane a KEYBOARD command means ══════════════════════════════
	   A right-click says which pane it meant by where it landed; a chord has
	   to be told. Focus alone is not the answer — clicking a tab re-renders
	   the strip, which destroys the button that was clicked, so focus falls
	   back to `body` and a focus-only rule made the chord a dead key
	   everywhere except inside a pane's own content (measured in the lobby,
	   2026-09-07). So: the pane holding focus, else the last one the POINTER
	   was over, which is the pane a person is looking at when they reach for
	   the keyboard.

	   The ID is stored, never the element — every rerender replaces the DOM,
	   and a held element would be a leaf that no longer exists. */
	let pointedLeafId: string | null = null;
	const onPointerOver = (event: Event): void => {
		const target = event.target;
		const leaf = target instanceof Element ? target.closest<HTMLElement>(".dock-leaf") : null;
		if (leaf?.dataset.leaf) {
			pointedLeafId = leaf.dataset.leaf;
		}
	};
	stage.addEventListener("pointerover", onPointerOver);

	const commandLeaf = (): DockLeaf | null =>
		leafOfElement(stage.ownerDocument.activeElement) ?? (pointedLeafId ? core.findLeaf(pointedLeafId) : null);

	const splitCommand = (zone: "r" | "b"): void => {
		const leaf = commandLeaf();
		const tabId = leaf?.active;
		if (!leaf || !tabId || leaf.tabs.length < 2) {
			return;
		}
		core.dropOnBody(leaf, zone, { kind: "tab", tab: tabId, source: leaf.id });
		rerender();
	};

	/* Same rule as the menu row's `disabled`: a pane with one tab has nothing
	   to send to a new pane, and splitting it would leave an empty one. */
	const canSplitCommand = (): boolean => {
		const leaf = commandLeaf();
		return leaf !== null && leaf.tabs.length >= 2;
	};

	const commands: readonly Command[] = [
		{
			id: DOCK_COMMANDS.toggleTabBars,
			/* the title states the CURRENT action, so one command serves the
			   menu row in both directions without a second id */
			get title() {
				return core.state.hideSingleTabBars ? "Show tabs" : "Hide tabs";
			},
			run: toggleTabBars,
		},
		{ id: DOCK_COMMANDS.splitRight, title: "Split right", enabled: canSplitCommand, run: () => splitCommand("r") },
		{ id: DOCK_COMMANDS.splitDown, title: "Split down", enabled: canSplitCommand, run: () => splitCommand("b") },
	];
	const keymap = { ...DOCK_KEYMAP, ...ports.keymap };

	const barsItem = (): DockMenuItem => {
		const hint = commandHint(keymap, DOCK_COMMANDS.toggleTabBars);
		const item: DockMenuItem = { label: `Layout/${commands[0]!.title}`, separator: true, run: toggleTabBars };
		/* an unbound command still gets its row — just no accelerator */
		if (hint.length > 0) {
			item.hint = hint;
		}
		return item;
	};

	/* The stage's OWN document, not `document`: a dock mounted in an iframe
	   (the compare tools do exactly that) never sees the parent's keystrokes.
	   `accepts` keeps two docks on one page from both answering one chord;
	   typing targets are skipped inside `bindKeymap`. */
	const unbindKeymap = bindKeymap({
		target: stage.ownerDocument,
		commands,
		keymap,
		accepts: (event) => {
			const target = event.target;
			if (!(target instanceof Element)) {
				return true;
			}
			return stage.contains(target) || target === stage.ownerDocument.body;
		},
	});

	const menuItemsFor = (event: MouseEvent): DockMenuItem[] => {
		const element = event.target as Element | null;
		const tabElement = element?.closest<HTMLElement>(".dock-tab, .dock-group-tab");
		const tabId = tabElement?.dataset.tab ?? tabElement?.dataset.dev?.replace(/^dock-group-tab-/, "");
		const leaf = leafOfElement(element);
		const items: DockMenuItem[] = [];

		/* `Open` LEADS, because it is the only row that answers "where did my
		   tab go" — everything else acts on a tab already in front of you.
		   ([HUMAN] Sam 2026-09-07.) */
		items.push(...unopenedItems(leaf));

		if (tabId && leaf) {
			const definition = ports.tabs.get(tabId);
			const others = leaf.tabs.filter((id) => id !== tabId);
			items.push(
				{
					label: "Layout/Close",
					disabled: definition?.closable === false,
					run: () => {
						core.closeTab(leaf, tabId);
						rerender();
					},
				},
				{
					label: "Layout/Close others",
					disabled: others.length === 0,
					run: () => {
						for (const id of others) {
							if (ports.tabs.get(id)?.closable === false) {
								continue;
							}
							core.closeTab(leaf, id);
						}
						rerender();
					},
				},
				{
					label: "Layout/Float",
					separator: true,
					run: () => {
						const theme = themeOf(stage);
						const rect = stage.getBoundingClientRect();
						core.dropAsFloat(
							Math.max(theme.floatPlaceMargin, event.clientX - rect.left - theme.floatGhostOffsetX),
							Math.max(theme.floatPlaceMargin, event.clientY - rect.top - theme.floatGhostOffsetY),
							theme.floatDefaultWidth,
							theme.floatDefaultHeight,
							{ kind: "tab", tab: tabId, source: leaf.id },
						);
						rerender();
					},
				},
				/* the same landing a drag on that edge makes — the tab leaves
				   this pane and opens a new one beside or below it */
				{
					label: "Layout/Split right",
					hint: commandHint(keymap, DOCK_COMMANDS.splitRight),
					disabled: leaf.tabs.length < 2,
					run: () => {
						core.dropOnBody(leaf, "r", { kind: "tab", tab: tabId, source: leaf.id });
						rerender();
					},
				},
				{
					label: "Layout/Split down",
					hint: commandHint(keymap, DOCK_COMMANDS.splitDown),
					disabled: leaf.tabs.length < 2,
					run: () => {
						core.dropOnBody(leaf, "b", { kind: "tab", tab: tabId, source: leaf.id });
						rerender();
					},
				},
			);
		} else if (leaf) {
			items.push({
				label: leaf.collapsed ? "Layout/Expand" : "Layout/Collapse",
				run: () => {
					if (leaf.collapsed) {
						core.openLeaf(leaf);
					} else {
						core.collapseGuarded(leaf);
					}
					rerender();
				},
			});
		}

		/* a stage-wide row, so it is reachable from a tab, a pane, and the
		   bare stage alike — including when hiding the bars is what left no
		   strip to right-click */
		items.push(barsItem());

		const context: DockMenuContext = {};
		if (tabId) {
			context.tabId = tabId;
		}
		if (leaf) {
			context.leafId = leaf.id;
			/* The tab the pane is SHOWING, whether or not the click landed on
			   its strip. A right-click in a pane's body means that pane's
			   visible tab to everyone who tries it — and with single-tab bars
			   hidden there is no strip to aim at, so without this a consumer
			   row about "this run" was unreachable for exactly the panes that
			   need it most. */
			if (leaf.active) {
				context.activeTabId = leaf.active;
			}
		}
		const consumer = ports.menu?.items(context) ?? [];
		if (consumer.length > 0) {
			const [first, ...rest] = consumer;
			items.push({ ...first!, separator: true }, ...rest);
		}
		return items;
	};

	/* THE DOCK MENU OWNS CHROME; THE NATIVE MENU OWNS TEXT.
	   A right-click over an input, a textarea, a contenteditable or a live
	   selection passes through untouched. Chrome has no escape hatch once a
	   page calls `preventDefault`, so eating Copy / Paste / Select all /
	   spellcheck to show four rows of pane chrome is a bad trade — and this
	   handler used to take every right-click on the stage, tools and dev
	   panels included. Shift+right-click always passes: Firefox forces it
	   regardless, so honouring it in Chromium too means a user is never
	   trapped without Copy or Inspect.

	   "Text" means a field you can TYPE INTO, not every input — a range and
	   a checkbox are controls, and matching them here would send a
	   right-click on a slider to the browser instead of to the pane.

	   The predicate is `shouldOpenPaneMenu` in the control kit, tested
	   there. ([HUMAN] Sam 2026-09-05.) */
	stage.addEventListener("contextmenu", (event) => {
		const target = event.target;
		if (
			!(target instanceof Element) ||
			!shouldOpenPaneMenu({
				shiftKey: event.shiftKey,
				target,
				selectionLength: String(window.getSelection() ?? "").length,
				armed: false,
			})
		) {
			return;
		}
		event.preventDefault();
		openDockMenu(stage, menuItemsFor(event), event.clientX, event.clientY);
	});

	/* ══ render ═════════════════════════════════════════════════════════ */

	const rerender = (): void => {
		unmountContent();
		rootElement.innerHTML = "";
		if (!core.state.layout) {
			const empty = document.createElement("div");
			empty.className = "dock-empty";
			empty.dataset.dev = "dock-empty";
			empty.textContent = "empty layout — drop a tab or a reference here";
			wireEmpty(empty);
			rootElement.append(empty);
		} else {
			rootElement.append(renderNode(core.state.layout));
		}
		stage.querySelectorAll(".dock-float").forEach((float) => float.remove());
		core.state.floating.forEach(renderFloat);
		stage.querySelectorAll<HTMLElement>(".dock-tabstrip,.dock-group.col").forEach((strip) => {
			centerActive(strip);
			updateSpill(strip);
		});
		emitChange();
	};

	/* The active tab of an overflowing strip re-centers on every render —
	   selection triggers a render, manual scrolling never does. */
	const centerActive = (strip: HTMLElement): void => {
		const on = strip.querySelector<HTMLElement>(".dock-tab.on");
		if (!on || !strip.clientWidth || strip.scrollWidth <= strip.clientWidth + 2) {
			return;
		}
		strip.scrollLeft = on.offsetLeft - (strip.clientWidth - on.offsetWidth) / 2;
	};

	/** Spill state (.can-l/.can-r) drives the overflow treatment's indicators. */
	const updateSpill = (strip: HTMLElement, byUser?: boolean): void => {
		const over = strip.scrollWidth > strip.clientWidth + 2;
		strip.classList.toggle("can-l", over && strip.scrollLeft > 2);
		strip.classList.toggle("can-r", over && strip.scrollLeft < strip.scrollWidth - strip.clientWidth - 2);
		if (over && byUser) {
			ports.on?.event?.("overflow");
		}
	};

	/** Edge fade; with a `node` it also carries the paging chevron. */
	const makeSpill = (node: DockLeaf | null, side: "l" | "r"): HTMLElement => {
		const spill = document.createElement("div");
		spill.className = `dock-spill ${side}`;
		spill.append(document.createElement("i"));
		if (!node) {
			return spill;
		}
		const chevron = document.createElement("button");
		chevron.type = "button";
		chevron.tabIndex = -1;
		chevron.textContent = side === "l" ? "‹" : "›";
		chevron.title = side === "l" ? "Previous tab" : "Next tab";
		chevron.dataset.dev = `dock-spill-${side}`;
		chevron.addEventListener("click", () => {
			/* chevron selects prev/next tab; at the ends it re-selects the
			   end tab, which re-centers it in view */
			const at = node.active === null ? -1 : node.tabs.indexOf(node.active);
			const to = Math.max(0, Math.min(node.tabs.length - 1, at + (side === "l" ? -1 : 1)));
			node.active = node.tabs[to] ?? null;
			ports.on?.event?.("overflow");
			rerender();
		});
		spill.append(chevron);
		return spill;
	};

	/** The tab's status light. Severity only — the palette mapping is CSS. */
	const makeStatusDot = (status: DockTabStatus): HTMLElement => {
		const dot = document.createElement("span");
		dot.className = "dock-tab-dot";
		dot.dataset.status = status;
		dot.setAttribute("aria-label", status);
		return dot;
	};

	/** Hover-revealed × for tabs and collapsed chrome — closes what its host represents. */
	const makeClose = (close: () => void, label: string): HTMLElement => {
		const x = document.createElement("span");
		x.className = "dock-tab-close";
		x.textContent = "×";
		x.title = "Close";
		x.setAttribute("aria-label", label);
		x.dataset.dev = "dock-close";
		x.addEventListener("click", (event) => {
			event.stopPropagation();
			close();
		});
		return x;
	};

	/* Double-click and Enter are the same affordance: space every pane on
	   this divider's axis evenly. Two panes still land on 50/50, so the
	   common case reads as it always did. */
	const evenAxis = (node: DockSplit): void => {
		const panes = core.evenSplits(node);
		rerender();
		ports.on?.notify?.(`even split — ${panes} panes across`);
	};

	const renderNode = (node: DockNode): HTMLElement => {
		if ("leaf" in node) {
			return renderLeaf(node);
		}
		const element = document.createElement("div");
		element.className = `dock-split ${node.split}`;
		const renderChild = (child: DockNode): HTMLElement =>
			mergesAsGroup(child, node.split) ? renderGroup(child as DockSplit, node.split) : renderNode(child);
		const a = renderChild(node.a);
		const b = renderChild(node.b);
		/* a collapsed side is fixed; its sibling must grow 1 — grow sums
		   below 1 only distribute that fraction of the free space (flex
		   spec). Collapse is RECURSIVE: a split whose children are all
		   collapsed collapses too. */
		const aCollapsed = isCollapsedTree(node.a);
		const bCollapsed = isCollapsedTree(node.b);
		a.style.flex = aCollapsed ? "0 0 auto" : `${bCollapsed ? 1 : node.ratio} 1 0`;
		b.style.flex = bCollapsed ? "0 0 auto" : `${aCollapsed ? 1 : 1 - node.ratio} 1 0`;
		const divider = document.createElement("div");
		divider.className = "dock-divider";
		divider.dataset.dev = "dock-divider";
		dividerNodes.set(divider, node);
		divider.tabIndex = 0;
		divider.setAttribute("role", "separator");
		divider.setAttribute("aria-orientation", node.split === "row" ? "vertical" : "horizontal");
		divider.setAttribute("aria-valuenow", String(Math.round(node.ratio * 100)));
		divider.title = "Drag to resize · double-click or Enter spaces the axis evenly · arrows nudge";
		if (aCollapsed || bCollapsed) {
			divider.classList.add("disabled"); /* collapsed side: fixed */
			divider.tabIndex = -1;
		}
		divider.addEventListener("pointerdown", (event) => onDividerDown(event, divider, node));
		divider.addEventListener("dblclick", () => {
			evenAxis(node);
		});
		divider.addEventListener("keydown", (event) => {
			const theme = themeOf(stage);
			const horizontal = node.split === "row";
			const back = horizontal ? "ArrowLeft" : "ArrowUp";
			const forward = horizontal ? "ArrowRight" : "ArrowDown";
			const delta = event.key === back ? -theme.ratioStep : event.key === forward ? theme.ratioStep : null;
			if (event.key === "Enter") {
				evenAxis(node);
				[...rootElement.querySelectorAll<HTMLElement>(".dock-divider")]
					.find((candidate) => dividerNodes.get(candidate) === node)
					?.focus();
				return;
			}
			if (delta === null) {
				return;
			}
			event.preventDefault();
			node.ratio = Math.max(theme.ratioClamp, Math.min(1 - theme.ratioClamp, node.ratio + delta));
			(divider.previousElementSibling as HTMLElement).style.flex = `${node.ratio} 1 0`;
			(divider.nextElementSibling as HTMLElement).style.flex = `${1 - node.ratio} 1 0`;
			divider.setAttribute("aria-valuenow", String(Math.round(node.ratio * 100)));
			ports.on?.event?.("resize");
			emitChange();
		});
		element.append(a, divider, b);
		return element;
	};

	const renderLeaf = (node: DockLeaf): HTMLElement => {
		const element = document.createElement("div");
		/* bare pane: one tab and no choice for a heading to offer, so content
		   owns the pane — the root solo pane always, every docked single-tab
		   pane while `hideSingleTabBars` is on (`isBareLeaf`) */
		const bare = isBareLeaf(core.state, node, core.floatOf(node) !== null);
		element.className = `dock-leaf${node.collapsed ? " collapsed" : ""}${bare ? " solo" : ""}`;
		element.dataset.leaf = node.id;
		const strip = document.createElement("div");
		strip.className = "dock-tabstrip";
		strip.dataset.dev = `dock-strip-${node.id}`;
		strip.setAttribute("role", "tablist");
		strip.append(makeSpill(node, "l"));
		node.tabs.forEach((tabId) => {
			const def = ports.tabs.get(tabId);
			if (!def) {
				return;
			}
			const tab = document.createElement("button");
			tab.className = `dock-tab${node.active === tabId ? " on" : ""}`;
			tab.dataset.tab = tabId;
			tab.dataset.dev = `dock-tab-${tabId}`;
			tab.setAttribute("role", "tab");
			tab.setAttribute("aria-selected", String(node.active === tabId));
			tab.title = def.title;
			if (def.status) {
				tab.append(makeStatusDot(def.status));
			}
			const label = document.createElement("span");
			label.className = "dock-tab-label";
			label.textContent = def.title;
			tab.append(label);
			if (def.closable !== false) {
				tab.append(
					makeClose(() => {
						core.closeTab(node, tabId);
						rerender();
					}, `Close ${def.title}`),
				);
				tab.addEventListener("auxclick", (event) => {
					/* middle-click close */
					if (event.button === 1) {
						event.preventDefault();
						core.closeTab(node, tabId);
						rerender();
					}
				});
			}
			tab.addEventListener("click", () => {
				if (node.active === tabId && !node.collapsed) {
					core.collapseGuarded(node); /* active tab → collapse/shade */
				} else {
					core.openLeaf(node, tabId);
				} /* any select → expand */
				rerender();
			});
			tab.addEventListener("keydown", (event) => {
				/* roving strip focus */
				if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") {
					return;
				}
				event.preventDefault();
				const tabs = [...(tab.parentElement?.querySelectorAll<HTMLElement>(".dock-tab") ?? [])];
				const at = tabs.indexOf(tab);
				const to: Record<string, number> = {
					ArrowLeft: Math.max(0, at - 1),
					ArrowRight: Math.min(tabs.length - 1, at + 1),
					Home: 0,
					End: tabs.length - 1,
				};
				tabs[to[event.key]!]?.focus();
			});
			wireDragSource(tab, () => ({ kind: "tab", tab: tabId, source: node.id }));
			strip.append(tab);
		});
		strip.append(makeSpill(node, "r"));
		/* the strip's empty area drags the WHOLE pane (all tabs, order +
		   active kept) and click-toggles collapse — float strips included
		   (a float pane collapsing = the window shading). */
		wireDragSource(strip, () => ({ kind: "pane", source: node.id }));
		strip.addEventListener("click", (event) => {
			if (event.target !== strip) {
				return;
			}
			if (node.collapsed) {
				core.openLeaf(node);
			} else {
				core.collapseGuarded(node);
			}
			rerender();
		});
		strip.addEventListener("wheel", (event) => {
			event.preventDefault();
			strip.scrollLeft += event.deltaY + event.deltaX;
			updateSpill(strip, true);
		});
		strip.addEventListener("scroll", () => updateSpill(strip, true));
		/* strips are precise join targets: root band needs ⇧ over them —
		   else edge-flush strips could never take a plain drop */
		wireDropTarget(strip, {
			shiftRoot: true,
			over: (event) => {
				hidePreview();
				const index = stripIndex(strip, event.clientX);
				const tabs = strip.querySelectorAll<HTMLElement>(".dock-tab");
				insertBar.style.left = `${insertOffset(tabs, index, themeOf(stage).insertFallback)}px`;
				strip.append(insertBar);
			},
			drop: (event, drag) => landOnStrip(node, stripIndex(strip, event.clientX), drag, mintOf(event)),
		});
		const body = document.createElement("div");
		body.className = "dock-body";
		const content = document.createElement("div");
		content.className = "dock-content";
		const active = node.active === null ? undefined : ports.tabs.get(node.active);
		if (active) {
			if (active.fit) {
				content.dataset.fit = active.fit;
			}
			active.render(content);
			mountedTabs.push(active);
		}
		body.append(content);
		/* THE TAB PANE WEARS THE KIT'S RAIL. A tab's content is the estate's
		   most-scrolled box and it was the one scrollport still on the native
		   bar: on macOS that bar is absent until you are already scrolling,
		   so a pane could not say it had more below, could not say where you
		   were in it, and could not be aimed at before it appeared. The frame
		   is the body (it does not scroll) and the scrollport is
		   `.dock-content` itself, so `render(content)` still hands a tab the
		   element the port documents. */
		mountedRails.push(bindScroll(body, content));
		wireDropTarget(body, {
			over: (event) => showPreview(element, zoneOf(body, event)) /* preview spans strip+body */,
			drop: (event, drag) => landOnBody(node, zoneOf(body, event), drag, mintOf(event)),
		});
		const stub = document.createElement("button");
		stub.className = "dock-collapsed-stub";
		stub.dataset.dev = `dock-stub-${node.id}`;
		stub.title = "Expand";
		stub.textContent = "▸";
		stub.addEventListener("click", () => {
			core.openLeaf(node);
			rerender();
		});
		/* a collapsed ▸ stub drags its whole pane, like the strip's empty
		   area; a drop on it joins as a tab and opens the pane */
		wireDragSource(stub, () => ({ kind: "pane", source: node.id }));
		wireDropTarget(stub, {
			over: () => showPreview(element, "c"),
			drop: (event, drag) => landOnStrip(node, node.tabs.length, drag, mintOf(event)),
		});
		element.append(strip, body, stub);
		return element;
	};

	/* Group: a fully-collapsed split. Vertical rail (row parent): a single
	   ▸. Horizontal bar (col parent): STRUCTURAL — one cell per child in
	   tree order; a leaf cell lists every tab, a nested-split cell shows ▸;
	   each cell reopens (or takes a drop into) its own side. */
	const wireGroupDrops = (element: HTMLElement, targetOf: () => DockLeaf | null): void => {
		wireDropTarget(element, {
			over: () => showPreview(element, "c"),
			drop: (event, drag) => {
				const leaf = targetOf();
				if (!leaf) {
					return dragCleanup();
				}
				landOnStrip(leaf, leaf.tabs.length, drag, mintOf(event)); /* the join expands the target pane */
			},
		});
	};

	const renderGroup = (subtree: DockSplit, axis: "row" | "col"): HTMLElement => {
		const titleOf = (leaf: DockLeaf | null): string => {
			if (leaf) {
				if (leaf.active === null) {
					return "";
				}
				return ports.tabs.get(leaf.active)?.title ?? leaf.active;
			}
			return "";
		};
		if (axis === "row") {
			const rail = document.createElement("button");
			rail.className = "dock-group row";
			rail.dataset.dev = "dock-group-rail";
			rail.title = `Reopen ${titleOf(lastCollapsedOf(subtree))}`;
			rail.textContent = "▸";
			rail.addEventListener("click", () => {
				core.openLeaf(lastCollapsedOf(subtree));
				rerender();
			});
			wireGroupDrops(rail, () => lastCollapsedOf(subtree));
			wireDragSource(rail, () => ({ kind: "tree", node: subtree })); /* rail drags the split */
			return rail;
		}
		const bar = document.createElement("div");
		bar.className = "dock-group col";
		bar.dataset.dev = "dock-group-bar";
		bar.append(makeSpill(null, "l"));
		/* side-by-side (row) nesting FLATTENS into the bar — its panes
		   already read left-to-right like the bar's cells, at any row-depth,
		   in tree order; only a nested COL split (a vertical stack) keeps a
		   single ▸ cell */
		const cells: DockNode[] = [];
		const flatten = (node: DockNode): void => {
			if ("leaf" in node || node.split === "col") {
				cells.push(node);
			} else {
				flatten(node.a);
				flatten(node.b);
			}
		};
		flatten(subtree.a);
		flatten(subtree.b);
		cells.forEach((child) => {
			const cell = document.createElement("button");
			cell.className = "dock-group-cell";
			cell.dataset.dev = "dock-group-cell";
			const target = (): DockLeaf | null => ("leaf" in child ? child : lastCollapsedOf(child));
			if ("leaf" in child) {
				/* one clickable title per tab — reopen on that tab; each
				   carries a hover-× closing it, and drags that tab out
				   (strip parity) */
				child.tabs.forEach((tabId) => {
					const title = ports.tabs.get(tabId)?.title ?? tabId;
					const cellTab = document.createElement("span");
					cellTab.className = "dock-group-tab";
					cellTab.dataset.dev = `dock-group-tab-${tabId}`;
					const status = ports.tabs.get(tabId)?.status;
					if (status) {
						cellTab.append(makeStatusDot(status));
					}
					cellTab.append(document.createTextNode(title));
					cellTab.title = `Open ${title}`;
					cellTab.addEventListener("click", (event) => {
						event.stopPropagation();
						core.openLeaf(child, tabId);
						rerender();
					});
					if (ports.tabs.get(tabId)?.closable !== false) {
						cellTab.append(
							makeClose(() => {
								core.closeTab(child, tabId);
								rerender();
							}, `Close ${title}`),
						);
					}
					wireDragSource(cellTab, () => ({ kind: "tab", tab: tabId, source: child.id }));
					cell.append(cellTab);
				});
				/* the cell's padding drags its whole pane */
				wireDragSource(cell, () => ({ kind: "pane", source: child.id }));
			} else {
				/* nested-split cell: bare ▸, no close button; drags its subtree */
				const label = document.createElement("span");
				label.className = "dock-group-tab";
				label.textContent = "▸";
				cell.append(label);
				cell.title = `Reopen ${titleOf(target())}`;
				wireDragSource(cell, () => ({ kind: "tree", node: child }));
			}
			cell.addEventListener("click", () => {
				core.openLeaf(target());
				rerender();
			});
			wireGroupDrops(cell, target);
			bar.append(cell);
		});
		bar.append(makeSpill(null, "r"));
		/* the bar's empty area (right of the cells): click reopens the
		   group's last-collapsed pane; dragging it drags the FULL split */
		bar.addEventListener("click", (event) => {
			if ((event.target as HTMLElement).closest(".dock-group-cell")) {
				return;
			}
			core.openLeaf(lastCollapsedOf(subtree));
			rerender();
		});
		bar.addEventListener("wheel", (event) => {
			event.preventDefault();
			bar.scrollLeft += event.deltaY + event.deltaX;
			updateSpill(bar, true);
		});
		bar.addEventListener("scroll", () => updateSpill(bar, true));
		/* a drop on the bar's EMPTY area always becomes a NEW pane below the
		   bar; joining as a tab is the cells' job */
		wireDropTarget(bar, {
			over: () => showPreview(bar, "c"),
			drop: (event, drag) => {
				const changed = core.dropOnGroupBar(subtree, drag, mintOf(event));
				dragCleanup();
				if (changed) {
					rerender();
				}
			},
		});
		wireDragSource(bar, () => ({ kind: "tree", node: subtree }));
		return bar;
	};

	const renderFloat = (float: DockFloat): void => {
		const element = document.createElement("div");
		const shaded = isCollapsedTree(float.root);
		element.className = `dock-float${float.z === core.topZ() ? " front" : ""}${shaded ? " shaded" : ""}`;
		element.dataset.dev = `dock-float-${float.id}`;
		element.style.cssText =
			`left:${float.x}px;top:${float.y}px;` +
			`width:${shaded ? "auto" : float.w + "px"};` +
			`height:${shaded ? "auto" : float.h + "px"};z-index:${float.z}`;
		/* a float is a full tree; a fully-collapsed root renders as its
		   group bar — the shaded window IS its collapsed form, w/h kept
		   for unshade */
		element.append(
			/* a shaded float presents its root as a bar, so it merges on the
			   same "col" terms a col-parent child would */
			mergesAsGroup(float.root, "col") ? renderGroup(float.root as DockSplit, "col") : renderNode(float.root),
		);
		/* window grip — the one surface that MOVES the window; its drags
		   never dock-assign. Lives LEFT of the first strip's tabs (visible
		   expanded and shaded): × affordances sit right, and the left edge
		   stays put. */
		const grip = document.createElement("span");
		grip.className = "dock-float-grip";
		grip.dataset.dev = `dock-grip-${float.id}`;
		grip.textContent = "⠿";
		grip.title = "Move window";
		grip.draggable = true; /* claim + cancel HTML5 drags */
		grip.addEventListener("dragstart", (event) => {
			event.preventDefault();
			event.stopPropagation();
		});
		/* a grip release fires a click (capture keeps down+up on the grip)
		   — swallow it, or it bubbles to the host bar/strip and expands a
		   shaded window. Grip clicks mean nothing anywhere. */
		grip.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
		});
		grip.addEventListener("pointerdown", (event) => startFloatMove(event, float, element));
		element.querySelector(".dock-tabstrip,.dock-group")?.prepend(grip);
		if (!shaded) /* no resize while shaded */
		{
			(["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const).forEach((direction) => {
				const handle = document.createElement("div");
				handle.className = "dock-float-edge";
				handle.dataset.dir = direction;
				handle.dataset.dev = `dock-float-edge-${direction}`;
				handle.addEventListener("pointerdown", (event) => startFloatResize(event, float, element, direction));
				element.append(handle);
			});
		}
		element.addEventListener(
			"pointerdown",
			() => {
				if (core.raiseFloat(float)) {
					element.style.zIndex = String(float.z);
					stage.querySelectorAll(".dock-float.front").forEach((other) => other.classList.remove("front"));
					element.classList.add("front");
					emitChange();
				}
			},
			true,
		);
		stage.append(element);
	};

	const wireEmpty = (empty: HTMLElement): void => {
		wireDropTarget(empty, {
			over: () => empty.classList.add("drag-over"),
			leave: () => empty.classList.remove("drag-over"),
			drop: (event, drag) => {
				const changed = core.dropOnEmpty(drag, mintOf(event));
				dragCleanup();
				if (changed) {
					rerender();
				}
			},
		});
	};

	/* ══ dividers — pointer-captured drag, min-pane clamp, no rAF ═══════ */
	const onDividerDown = (event: PointerEvent, divider: HTMLElement, node: DockSplit): void => {
		const theme = themeOf(stage);
		const horizontal = node.split === "row";
		const parent = divider.parentElement;
		if (!parent) {
			return;
		}
		const rect = parent.getBoundingClientRect();
		const inner = (horizontal ? rect.width : rect.height) - theme.divider;
		if (inner <= 0) {
			return;
		}
		divider.setPointerCapture(event.pointerId);
		divider.classList.add("active");
		document.body.classList.add("resizing");
		/* ONE clamp for both sides again: the floor is a label's height now, so
		   there is no pane a tab could usefully declare itself smaller than
		   (a per-tab minimum lived here for one sitting, between the editor
		   bar's complaint and the floor being fixed for everything). */
		const move = (moveEvent: PointerEvent): void => {
			const raw =
				((horizontal ? moveEvent.clientX - rect.left : moveEvent.clientY - rect.top) - theme.divider / 2) / inner;
			const min = Math.min(theme.minPane / inner, 0.5);
			node.ratio = Math.max(min, Math.min(1 - min, raw));
			(divider.previousElementSibling as HTMLElement).style.flex = `${node.ratio} 1 0`;
			(divider.nextElementSibling as HTMLElement).style.flex = `${1 - node.ratio} 1 0`;
			ports.on?.event?.("resize");
		};
		const up = (): void => {
			divider.classList.remove("active");
			document.body.classList.remove("resizing");
			divider.removeEventListener("pointermove", move);
			divider.removeEventListener("pointerup", up);
			emitChange();
		};
		divider.addEventListener("pointermove", move);
		divider.addEventListener("pointerup", up);
	};

	/* ══ floats — pointer-event move / resize / z-order ═════════════════ */
	/* Grip drag: pure window move — never dock-assigns (re-dock by
	   dragging the float's tabs / strip / bar, ordinary drag sources). */
	const startFloatMove = (event: PointerEvent, float: DockFloat, element: HTMLElement): void => {
		event.preventDefault();
		element.classList.add("moving");
		const theme = themeOf(stage);
		const rect = stage.getBoundingClientRect();
		const offsetX = event.clientX - float.x;
		const offsetY = event.clientY - float.y;
		const grip = event.currentTarget as HTMLElement;
		grip.setPointerCapture(event.pointerId);
		const move = (moveEvent: PointerEvent): void => {
			float.x = Math.round(Math.max(0, Math.min(moveEvent.clientX - offsetX, rect.width - theme.stageClampMarginX)));
			float.y = Math.round(Math.max(0, Math.min(moveEvent.clientY - offsetY, rect.height - theme.stageClampMarginY)));
			element.style.left = `${float.x}px`;
			element.style.top = `${float.y}px`;
			ports.on?.event?.("zmove");
		};
		const up = (): void => {
			element.classList.remove("moving");
			grip.removeEventListener("pointermove", move);
			grip.removeEventListener("pointerup", up);
			emitChange();
		};
		grip.addEventListener("pointermove", move);
		grip.addEventListener("pointerup", up);
	};

	/** Resize from any edge or corner; the opposite edge stays anchored. */
	const startFloatResize = (event: PointerEvent, float: DockFloat, element: HTMLElement, direction: string): void => {
		event.preventDefault();
		event.stopPropagation();
		const handle = event.currentTarget as HTMLElement;
		handle.setPointerCapture(event.pointerId);
		const theme = themeOf(stage);
		const rect = stage.getBoundingClientRect();
		const startX = event.clientX;
		const startY = event.clientY;
		const start = { x: float.x, y: float.y, w: float.w, h: float.h };
		const move = (moveEvent: PointerEvent): void => {
			const deltaX = moveEvent.clientX - startX;
			const deltaY = moveEvent.clientY - startY;
			if (direction.includes("e")) {
				float.w = Math.round(Math.max(theme.floatMinWidth, Math.min(start.w + deltaX, rect.width - start.x)));
			}
			if (direction.includes("s")) {
				float.h = Math.round(Math.max(theme.floatMinHeight, Math.min(start.h + deltaY, rect.height - start.y)));
			}
			if (direction.includes("w")) {
				const nextX = Math.round(Math.max(0, Math.min(start.x + deltaX, start.x + start.w - theme.floatMinWidth)));
				float.w = start.w + (start.x - nextX);
				float.x = nextX;
			}
			if (direction.includes("n")) {
				const nextY = Math.round(Math.max(0, Math.min(start.y + deltaY, start.y + start.h - theme.floatMinHeight)));
				float.h = start.h + (start.y - nextY);
				float.y = nextY;
			}
			element.style.left = `${float.x}px`;
			element.style.top = `${float.y}px`;
			element.style.width = `${float.w}px`;
			element.style.height = `${float.h}px`;
			ports.on?.event?.("zmove");
		};
		const up = (): void => {
			handle.removeEventListener("pointermove", move);
			handle.removeEventListener("pointerup", up);
			rerender();
		};
		handle.addEventListener("pointermove", move);
		handle.addEventListener("pointerup", up);
	};

	/* ══ handle + automation seam ═══════════════════════════════════════ */

	const openTab = (id: string, options?: DockOpenOptions): void => {
		let holder: DockLeaf | null = null;
		core.eachLeaf((leaf) => {
			if (leaf.tabs.includes(id)) {
				holder = leaf;
			}
		});
		if (holder) {
			core.openLeaf(holder, id);
			rerender();
			return;
		}
		const target =
			(options?.leafId ? core.findLeaf(options.leafId) : null) ??
			(core.state.layout ? firstLeafOf(core.state.layout) : null);
		if (target) {
			target.tabs.push(id);
			core.openLeaf(target, id);
		} else if (!core.state.layout) {
			core.state.layout = core.newLeaf([id]);
		}
		rerender();
	};

	const closeTab = (id: string): void => {
		let holder: DockLeaf | null = null;
		core.eachLeaf((leaf) => {
			if (leaf.tabs.includes(id)) {
				holder = leaf;
			}
		});
		if (!holder) {
			return;
		}
		core.closeTab(holder, id);
		rerender();
	};

	const handle: DockHandle = {
		commands,
		serialize: () => core.serialize(),
		hydrate: (json) => {
			core.hydrate(json, knownTab);
			rerender();
		},
		openTab,
		closeTab,
		destroy: () => {
			closeDockMenu();
			unbindKeymap();
			stage.removeEventListener("pointerover", onPointerOver);
			unmountContent();
			stage.querySelectorAll(".dock-float").forEach((float) => float.remove());
			rootElement.remove();
			preview.remove();
			insertBar.remove();
			document.body.classList.remove("tab-drag");
			document.body.classList.remove("resizing");
			stage.classList.remove("dock-stage");
			const host = window as { __DOCK__?: DockAutomation };
			if (host.__DOCK__ === automation) {
				delete host.__DOCK__;
			}
		},
	};

	/* automation seam for agent panes (house convention, like
	   __LAYOUT_EDITOR__): serialize / hydrate / state inspection */
	const automation: DockAutomation = {
		serialize: handle.serialize,
		hydrate: handle.hydrate,
		state: () => core.state,
		openTab,
		closeTab,
	};
	(window as { __DOCK__?: DockAutomation }).__DOCK__ = automation;

	if (ports.state) {
		core.hydrate(ports.state, knownTab);
	}
	rerender();
	return handle;
};

const firstLeafOf = (node: DockNode): DockLeaf => {
	let first: DockLeaf | null = null;
	eachLeafOf(node, (leaf) => {
		first ??= leaf;
	});
	return first!;
};
