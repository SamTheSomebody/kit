<script lang="ts">
	import { placeMenu } from "./index.ts";
	import { bindCarryTarget } from "./carry.ts";
	import { itemLabel, pickerRows, slotAccepts, withRecent, type ObjectItem } from "./objectField.ts";

	import { tick } from "svelte";
	import IconButton from "./iconButton.svelte";
	import Label from "./label.svelte";

	import "./controls.css";
	import "./field.css";
	import "./menu.css";
	import "./carry.css";
	import "./objectField.css";

	/* UNITY'S OBJECT FIELD: a slot that holds one item of a domain by id.
	   - The held item is a PILL. Clicking it shows the item where it lives
	     (`onreveal`: select it in the Project or the Hierarchy).
	   - Drag a row out of a tree that `carry`s this `kind` and drop it on the
	     slot. While such a carry is in flight the slot lights up, so the
	     reader sees where it can go before they get there.
	   - The search icon opens the PICKER: type to filter (fuzzy, anywhere in
	     the label or id), arrows to move, Enter takes the highlighted row,
	     which is the best match. With nothing typed it lists recent picks,
	     then everything under its folder.
	   - × (or Delete on the slot) clears it, when empty is allowed.
	   It never takes a value its `items` don't list, so a drop or a pick
	   can't put a stale id in a document. */
	let {
		value = $bindable(""),
		items,
		kind,
		accepts,
		label,
		id,
		allowEmpty = false,
		emptyLabel = "(none)",
		invalid = false,
		message,
		disabled = false,
		onchange,
		onreveal,
	}: {
		/* the held item's id; "" for none */
		value?: string;
		items: readonly ObjectItem[];
		/* what the slot holds: a carry of this kind drops here (`Carried.kind`), and
		   every slot of a kind shares its recent picks */
		kind?: string;
		/* the carry kinds that drop here, when not only `kind` (a parent slot takes
		   a dragged `node`); none at all without either */
		accepts?: readonly string[];
		label?: string;
		id?: string;
		allowEmpty?: boolean;
		/* what "" reads as */
		emptyLabel?: string;
		invalid?: boolean;
		message?: string;
		disabled?: boolean;
		onchange?: (value: string) => void;
		/* show the held item where it lives; without it the pill opens the picker */
		onreveal?: (id: string) => void;
	} = $props();

	const held = $derived(items.find((item) => item.id === value));

	const set = (next: string): void => {
		if (next === value) return;
		value = next;
		if (kind !== undefined) recentPicks.set(kind, withRecent(recentPicks.get(kind) ?? [], next));
		onchange?.(next);
	};

	/* ── the drop target ─────────────────────────────────────────────── */
	let slot = $state<HTMLElement>();
	let ready = $state(false);
	let over = $state(false);

	$effect(() => {
		const kinds = accepts ?? (kind === undefined ? [] : [kind]);
		if (slot === undefined || kinds.length === 0 || disabled) return;
		return bindCarryTarget(slot, {
			accepts: (carried) => slotAccepts(kinds, items, carried),
			ondrop: (carried) => set(carried.id),
			onready: (carried) => (ready = carried !== undefined),
			onover: (taking) => (over = taking),
		});
	});

	/* ── the picker ──────────────────────────────────────────────────── */
	let open = $state(false);
	let query = $state("");
	let active = $state(0);
	let picker = $state<HTMLElement>();
	let search = $state<HTMLInputElement>();

	const rows = $derived(
		open
			? pickerRows(items, query, {
					recents: kind === undefined ? [] : (recentPicks.get(kind) ?? []),
					allowEmpty,
					emptyLabel,
				})
			: [],
	);

	const openPicker = async (): Promise<void> => {
		if (disabled) return;
		query = "";
		open = true;
		await tick();
		const at = rows.findIndex((row) => row.id === value);
		active = at < 0 ? 0 : at;
		search?.focus();
		place();
		showActive();
	};

	const closePicker = (refocus: boolean): void => {
		open = false;
		if (refocus) slot?.querySelector<HTMLElement>("button")?.focus();
	};

	const take = (at: number): void => {
		const row = rows[at];
		if (row === undefined) return;
		set(row.id);
		closePicker(true);
	};

	/* under the slot, as wide as it, kept inside the viewport (the menu's rule) */
	const place = (): void => {
		if (slot === undefined || picker === undefined) return;
		const view = slot.ownerDocument.defaultView ?? window;
		const box = slot.getBoundingClientRect();
		picker.style.minWidth = `${box.width}px`;
		const at = placeMenu(
			box.left,
			box.bottom,
			{ width: picker.offsetWidth, height: picker.offsetHeight },
			{ width: view.innerWidth, height: view.innerHeight },
			8,
		);
		picker.style.left = `${at.x}px`;
		picker.style.top = `${at.y}px`;
	};

	const showActive = (): void => {
		void tick().then(() =>
			picker?.querySelector<HTMLElement>(`[data-at="${active}"]`)?.scrollIntoView({ block: "nearest" }),
		);
	};

	const onSearchKey = (event: KeyboardEvent): void => {
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			if (rows.length === 0) return;
			active = (active + (event.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length;
			showActive();
		} else if (event.key === "Enter") {
			event.preventDefault();
			take(active);
		} else if (event.key === "Escape") {
			event.preventDefault();
			event.stopPropagation();
			closePicker(true);
		}
	};

	/* Typing resets the highlight to the best match. */
	const typed = (): void => {
		active = 0;
		void tick().then(place);
	};

	/* A press anywhere outside the picker and the slot closes it. Listened for on
	   the slot's own window: a tool mounted into another realm's page gets its
	   events there (the tree's rule). */
	$effect(() => {
		if (!open || slot === undefined) return;
		const view = slot.ownerDocument.defaultView ?? window;
		const outside = (event: PointerEvent): void => {
			const target = event.target as Node;
			if (picker?.contains(target) || slot?.contains(target)) return;
			closePicker(false);
		};
		const resize = (): void => closePicker(false);
		view.addEventListener("pointerdown", outside, true);
		view.addEventListener("resize", resize);
		return () => {
			view.removeEventListener("pointerdown", outside, true);
			view.removeEventListener("resize", resize);
		};
	});

	const onSlotKey = (event: KeyboardEvent): void => {
		if ((event.key === "Delete" || event.key === "Backspace") && allowEmpty && value !== "" && !disabled) {
			event.preventDefault();
			set("");
		}
	};
</script>

<script lang="ts" module>
	/* Recent picks per kind, for the page's life: every slot of a kind shares them. */
	const recentPicks = new Map<string, string[]>();
</script>

<span class="kit-field-block">
	{#if label}
		<Label text={label} for={id} />
	{/if}
	<span
		class="kit-field kit-object"
		class:invalid
		class:disabled
		class:ready
		class:over
		bind:this={slot}
		role="group"
		onkeydown={onSlotKey}
	>
		{#if value === ""}
			<button {id} type="button" class="kit-object-pill empty" {disabled} onclick={openPicker}>{emptyLabel}</button>
		{:else}
			<button
				{id}
				type="button"
				class="kit-object-pill"
				class:missing={held === undefined}
				{disabled}
				title={held === undefined ? `"${value}" isn't listed` : onreveal ? "Show it" : undefined}
				onclick={() => (onreveal ? onreveal(value) : openPicker())}
			>
				<span class="kit-object-label">{held ? itemLabel(held) : value}</span>
				{#if held?.note}<span class="kit-object-note">{held.note}</span>{/if}
			</button>
			{#if allowEmpty && !disabled}
				<IconButton class="kit-object-clear" name="close" label="Clear" tip={false} onclick={() => set("")} />
			{/if}
		{/if}
		<IconButton class="kit-field-action" name="search" label="Pick" {disabled} onclick={openPicker} />
	</span>
	{#if invalid && message}
		<span class="kit-field-message">{message}</span>
	{/if}
</span>

{#if open}
	<div class="kit-menu floating kit-object-picker" bind:this={picker} role="dialog" aria-label="Pick {label ?? kind ?? 'one'}">
		<span class="kit-field kit-object-search">
			<input
				bind:this={search}
				bind:value={query}
				type="search"
				placeholder="Search"
				oninput={typed}
				onkeydown={onSearchKey}
			/>
		</span>
		<div class="kit-object-rows" role="listbox">
			{#each rows as row, index (`${row.group ?? ""}\u0000${row.id}`)}
				{#if row.group !== undefined && row.group !== rows[index - 1]?.group}
					<span class="kit-object-group">{row.group}</span>
				{/if}
				<button
					type="button"
					class="kit-menu-item"
					class:is-hover={index === active}
					class:on={row.id === value}
					data-at={index}
					role="option"
					aria-selected={index === active}
					tabindex="-1"
					onpointerenter={() => (active = index)}
					onclick={() => take(index)}
				>
					<span class="kit-object-label">{row.label}</span>
					{#if row.note}<span class="kit-object-note">{row.note}</span>{/if}
				</button>
			{:else}
				<span class="kit-object-group">Nothing matches</span>
			{/each}
		</div>
	</div>
{/if}
