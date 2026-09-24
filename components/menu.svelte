<script lang="ts">
	import { hasTicks, isRule, placeMenu, placeSubmenu, menuRowForKey, type MenuItem } from "./index.ts";

	import "./menu.css";

	/* ONE MENU AT A TIME, whichever way it was raised — a chain, not a menu.
	   Every open level is in one list, outermost first, so closing a level
	   closes everything under it and opening a sibling row closes what the
	   last one opened. The split button used to build its own menu outside
	   that list, which nothing could then dismiss: every press left the last
	   one behind.

	   A submenu BUTTS AGAINST its parent, no gap, because a gap is a place
	   the pointer leaves the chain by accident — the single thing that makes
	   cascading menus feel broken.

	   The menu has NO VERTICAL PADDING at all: not at the ends, not around a
	   rule. The rows are the menu, and every cushion only held a row's hover
	   ground off an edge it belongs to. The tick gutter is reserved only
	   when a menu HAS something ticked, which most context menus do not. */
	let {
		items,
		x,
		y,
		margin = 8,
		onclose,
	}: {
		items: MenuItem[];
		x: number;
		y: number;
		/* DOCK_THEME.menuMargin — how near an edge a menu may sit */
		margin?: number;
		onclose?: () => void;
	} = $props();

	type Level = {
		items: MenuItem[];
		x: number;
		y: number;
		parentIndex?: number;
	};
	/* built in an effect rather than inline, so the chain follows the props
	   it was opened with instead of capturing their first values */
	let chain = $state<Level[]>([]);
	let elements = $state<HTMLElement[]>([]);
	let focused = $state(0);

	$effect(() => {
		chain = [{ items, x, y }];
	});

	/* Placement needs a measured box, so it happens after the level is in
	   the DOM: the level renders at its asked-for point and is nudged on the
	   same frame. */
	$effect(() => {
		const viewport = { width: window.innerWidth, height: window.innerHeight };
		chain.forEach((level, depth) => {
			const element = elements[depth];
			if (!element) {
				return;
			}
			const box = { width: element.offsetWidth, height: element.offsetHeight };
			const parent = depth > 0 ? elements[depth - 1]?.getBoundingClientRect() : undefined;
			const at = parent
				? placeSubmenu(parent, level.y, box, viewport, margin)
				: placeMenu(level.x, level.y, box, viewport, margin);
			element.style.left = `${at.x}px`;
			element.style.top = `${at.y}px`;
		});
	});

	const closeFrom = (depth: number): void => {
		chain = chain.slice(0, Math.max(1, depth));
	};

	const openSubmenu = (depth: number, index: number, submenu: MenuItem[], row: HTMLElement): void => {
		const next = chain.slice(0, depth + 1);
		next.push({ items: submenu, x: 0, y: row.getBoundingClientRect().top, parentIndex: index });
		chain = next;
	};
</script>

<svelte:window
	onpointerdown={(event) => {
		if (!(event.target as HTMLElement).closest(".kit-menu.floating")) onclose?.();
	}}
	onkeydown={(event) => {
		if (event.key === "Escape") {
			/* one level at a time, the way the pointer leaves it */
			if (chain.length > 1) closeFrom(chain.length - 1);
			else onclose?.();
			return;
		}
		const depth = chain.length - 1;
		const level = chain[depth];
		if (!level) return;
		const next = menuRowForKey(level.items, focused, event.key);
		if (next !== undefined) {
			event.preventDefault();
			focused = next;
			elements[depth]?.querySelector<HTMLElement>(`.kit-menu-item[data-at="${next}"]`)?.focus();
			return;
		}
		if (event.key === "ArrowLeft" && chain.length > 1) {
			event.preventDefault();
			closeFrom(chain.length - 1);
		}
	}}
	onresize={() => onclose?.()}
/>

{#each chain as level, depth (depth)}
	<div class="kit-menu floating" bind:this={elements[depth]} role="menu" style="position: fixed">
		{#each level.items as item, index (index)}
			{#if isRule(item)}
				<span class="kit-menu-rule"></span>
			{:else}
				<button
					type="button"
					class="kit-menu-item"
					class:on={item.on}
					class:open={chain[depth + 1]?.parentIndex === index}
					data-at={index}
					role="menuitem"
					disabled={item.disabled}
					onpointerenter={(event) => {
						focused = index;
						if (item.submenu) openSubmenu(depth, index, item.submenu, event.currentTarget);
						/* crossing a leaf folds away whatever a sibling opened */
						else closeFrom(depth + 1);
					}}
					onclick={(event) => {
						if (item.submenu) {
							event.stopPropagation();
							openSubmenu(depth, index, item.submenu, event.currentTarget);
							return;
						}
						item.action?.();
						onclose?.();
					}}
				>
					{#if hasTicks(level.items)}
						<span class="kit-menu-tick">{item.tick ? "✓" : ""}</span>
					{/if}
					{item.label}
					{#if item.hint}<span class="kit-menu-hint">{@html item.hint}</span>{/if}
					{#if item.submenu}<span class="kit-menu-caret">▸</span>{/if}
				</button>
			{/if}
		{/each}
	</div>
{/each}
