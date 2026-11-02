<script module lang="ts">
	import { SvelteSet } from "svelte/reactivity";

	/* WHICH SECTIONS ARE SHUT, by id, for the page and across reloads.
	   Everything starts open. One store per tool: every inspector in that
	   tool shares it, so picking another object keeps the same sections shut,
	   while two tools on one origin (two dev tools on localhost) keep their
	   own. The store is capped: ids for sections that no longer exist would
	   otherwise pile up in storage forever. */

	export interface FoldStore {
		isOpen(id: string): boolean;
		setOpen(id: string, open: boolean): void;
		/** Opens every one of `ids` (the folds on the way to something). Returns whether any was shut. */
		openAll(ids: readonly string[]): boolean;
	}

	/** Shut ids kept per store; the oldest go first past this. */
	const DEFAULT_LIMIT = 500;

	export const createFoldStore = (key: string, options: { readonly limit?: number } = {}): FoldStore => {
		const limit = options.limit ?? DEFAULT_LIMIT;
		const load = (): string[] => {
			try {
				const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
				return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
			} catch {
				return [];
			}
		};
		const shut = new SvelteSet<string>(typeof localStorage === "undefined" ? [] : load().slice(-limit));
		const persist = (): void => {
			try {
				localStorage.setItem(key, JSON.stringify([...shut]));
			} catch {
				// No storage (a private window): folds last for the page.
			}
		};
		return {
			isOpen: (id) => !shut.has(id),
			setOpen: (id, open) => {
				if (open) {
					shut.delete(id);
				} else {
					// Re-added last, so the cap drops the folds touched longest ago.
					shut.delete(id);
					shut.add(id);
					for (const oldest of shut) {
						if (shut.size <= limit) break;
						shut.delete(oldest);
					}
				}
				persist();
			},
			openAll: (ids) => {
				let opened = false;
				for (const id of ids) {
					if (shut.delete(id)) opened = true;
				}
				if (opened) persist();
				return opened;
			},
		};
	};

	/** The store a section uses when it is given none. */
	export const defaultFolds: FoldStore = createFoldStore("kit-inspector-folds");

	/** {@link defaultFolds}' `isOpen`, kept for callers from before stores. */
	export const isFoldOpen = (id: string): boolean => defaultFolds.isOpen(id);
	/** {@link defaultFolds}' `setOpen`. */
	export const setFoldOpen = (id: string, open: boolean): void => defaultFolds.setOpen(id, open);
	/** {@link defaultFolds}' `openAll`. */
	export const openFolds = (ids: readonly string[]): boolean => defaultFolds.openAll(ids);
</script>

<script lang="ts">
	import type { Snippet } from "svelte";

	import Section from "@samthesomebody/kit/components/section.svelte";

	/* A kit Section that folds, its fold remembered by `id` in a fold store
	   (the tool's, or the default one). Untitled, it is the bare rule and
	   doesn't fold. */
	let {
		id,
		title,
		store = defaultFolds,
		actions,
		children,
	}: {
		/** What the fold is remembered by. */
		id: string;
		/** None (or "") draws the bare rule, which doesn't fold. */
		title?: string;
		/** Where folds are kept: one per tool, from `createFoldStore`. */
		store?: FoldStore;
		/** Badges and keys before the twisty. */
		actions?: Snippet;
		children: Snippet;
	} = $props();
</script>

{#if title === undefined || title === ""}
	<Section>{@render children()}</Section>
{:else}
	<Section {title} status={actions} bind:open={() => store.isOpen(id), (next) => store.setOpen(id, next === true)}>
		{@render children()}
	</Section>
{/if}
