<script lang="ts">
	/**
	 * Dock — the `ui` face of the `dock` kit
	 * (). The core is
	 * framework-agnostic TS + DOM because the DEV game shell must mount docks
	 * with no Svelte at all; this wrapper is what tools use, so they keep
	 * depending on `ui` alone.
	 *
	 * Tab content is a **snippet** — the natural thing in a Svelte tool — and
	 * the wrapper adapts it to the kit's imperative `render(element)`: each
	 * snippet renders into its own host element parked off-screen, and
	 * `render` re-parents that host into the pane. Svelte keeps owning the
	 * content (state, effects, transitions all survive), the kit only ever
	 * moves the node, and a full dock re-render costs a re-parent rather than
	 * a re-mount. `render` stays available as the escape hatch for content
	 * Svelte does not own — a game canvas, an existing DOM dev panel.
	 */
	import type { Keymap } from "@samthesomebody/kit/components";
	import {
		createDock,
		type DockEventsPort,
		type DockExternalPort,
		type DockHandle,
		type DockMenuPort,
		type DockTabDef,
		type DockTabStatus,
	} from "./index.ts";
	import { untrack, type Snippet } from "svelte";

	export type DockTab = {
		id: string;
		title: string;
		/** Status light before the label — `busy` pulses in the accent. */
		status?: DockTabStatus;
		/** Folder path under the menu's "Open", e.g. `"Tools"`. */
		menuPath?: string;
		/** Svelte content, handed its own tab so ONE snippet can serve many
		 *  tabs — a tool per tab, a run per tab — and tell which it is. */
		content?: Snippet<[DockTab]>;
		/** DOM content, for what Svelte does not own. */
		render?: (element: HTMLElement) => void;
		/** Called when DOM content is torn down; snippets clean themselves up. */
		destroy?: () => void;
		closable?: boolean;
		fit?: "cover";
	};

	let {
		tabs,
		layout,
		on,
		external,
		menu,
		keymap,
		fill = true,
		handle = $bindable(),
	}: {
		tabs: DockTab[];
		/** Fill the viewport (the default — a tool's page IS its dock). Set
		 *  false to nest a dock inside a sized parent instead. */
		fill?: boolean;
		/** Serialized layout to hydrate; persist it from `on.change`. The kit
		 *  calls this `state`; the prop is `layout` because Svelte reads a
		 *  local binding named `state` as a store when the `$state` rune is
		 *  also in scope, and silently makes `$state(...)` a subscription. */
		layout?: string;
		on?: DockEventsPort;
		external?: DockExternalPort;
		/** Extra right-click rows, below the kit's structural ones. */
		menu?: DockMenuPort;
		/** Rebinds, merged over the kit's `DOCK_KEYMAP` one entry at a time —
		 *  `{ "dock.toggleTabBars": "mod+k" }`. The commands carry no keys, so
		 *  this is the whole binding surface, and the menu row that teaches a
		 *  shortcut re-labels itself from it. */
		keymap?: Keymap;
		/** Bind to reach `serialize` / `hydrate` / `openTab` / `closeTab`. */
		handle?: DockHandle;
	} = $props();

	/* No `layout` means "just show me these tabs": one root leaf holding all
	   of them, first active. Without this a consumer that passes `tabs` and
	   nothing else gets the empty-layout drop target, and every tool would
	   have to hand-write a serialized tree to say the obvious thing. One tab
	   lands on the kit's root-solo rule, so a single-pane tool gets no chrome
	   at all. */
	const seededLayout = (): string | undefined => {
		if (layout !== undefined) {
			return layout;
		}
		if (tabs.length === 0) {
			return undefined;
		}
		return JSON.stringify({
			v: 1,
			layout: { leaf: true, id: "L1", tabs: tabs.map((tab) => tab.id), active: tabs[0]!.id },
			floating: [],
		});
	};

	let stage = $state<HTMLElement>();
	let parking = $state<HTMLElement>();
	const hosts = $state<Record<string, HTMLElement | undefined>>({});

	const definitionOf = (id: string): DockTabDef | undefined => {
		const tab = tabs.find((candidate) => candidate.id === id);
		if (!tab) {
			return undefined;
		}
		return {
			title: tab.title,
			status: tab.status,
			menuPath: tab.menuPath,
			closable: tab.closable,
			fit: tab.fit,
			render: (element) => {
				const host = hosts[tab.id];
				if (host) {
					element.append(host);
				} else {
					tab.render?.(element);
				}
			},
			destroy: () => {
				/* a snippet's host goes back to the parking lot rather than
				   being destroyed — the kit calls this on every re-render, and
				   Svelte still owns the node */
				const host = hosts[tab.id];
				if (host && parking) {
					parking.append(host);
				} else {
					tab.destroy?.();
				}
			},
		};
	};

	/* The dock is built ONCE per host. Everything the build reads is untracked
	   deliberately: seeding reads `tabs`, and the kit's first render calls
	   `definitionOf`, which reads it again — tracked, those reads would make
	   any change to the tab list tear the dock down and rebuild it, throwing
	   away every split, ratio and collapse the user had arranged. A tool with
	   tabs that come and go (a console pane, one per run) would reset its
	   whole layout on every run.

	   So the tab LIST is declarative but its membership is not: add or remove
	   a tab and drive it through the handle (`openTab` / `closeTab`), where
	   the consumer says which pane it belongs in. `definitionOf` still reads
	   the live array, so a tab's title and content stay reactive. */
	$effect(() => {
		const host = stage;
		if (!host) {
			return;
		}
		const dock = untrack(() =>
			createDock(host, {
				/* `list` is what lets the kit offer "open tab" for a tab that
				   sits in no pane — `get` can answer about an id but never
				   enumerate them. */
				tabs: { get: definitionOf, list: () => tabs.map((tab) => tab.id) },
				state: seededLayout(),
				on,
				external,
				menu,
				keymap,
			}),
		);
		handle = dock;
		return () => {
			dock.destroy();
			handle = undefined;
		};
	});
</script>

<div class="dock-stage" class:fill bind:this={stage}></div>
<div class="parking" bind:this={parking} aria-hidden="true">
	{#each tabs as tab (tab.id)}
		{#if tab.content}
			<div bind:this={hosts[tab.id]} class="host">{@render tab.content(tab)}</div>
		{/if}
	{/each}
</div>

<style>
	/* The kit sizes itself to its host, so the host must have a size — and
	   with `Layout` retired nothing else owns the viewport box. `fill` is the
	   default because a tool's page is its dock; nested docks turn it off and
	   take their size from a flex parent. */
	.dock-stage {
		flex: 1;
		min-width: 0;
		min-height: 0;
	}

	.dock-stage.fill {
		width: 100%;
		height: 100dvh;
		overflow: hidden;
	}

	/* Parked snippet hosts. Not `display: none` — a pane's content is
	   measured the moment it is re-parented, and a subtree that has never had
	   a layout box reports zero for everything (canvases size to nothing,
	   scroll positions land wrong). Off-screen keeps it laid out. */
	.parking {
		position: absolute;
		left: -99999px;
		top: 0;
		width: 0;
		height: 0;
		overflow: hidden;
	}

	.host {
		width: 100%;
		height: 100%;
	}
</style>
