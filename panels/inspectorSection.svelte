<script module lang="ts">
	import { SvelteSet } from "svelte/reactivity";

	/* Which sections are shut, by id, for the page and across reloads.
	   Everything starts open. One set for every inspector, so picking
	   another object keeps the same sections shut. */
	const STORAGE_KEY = "kit-inspector-folds";

	const load = (): string[] => {
		try {
			const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
			return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
		} catch {
			return [];
		}
	};

	const shut = new SvelteSet<string>(typeof localStorage === "undefined" ? [] : load());

	const persist = (): void => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify([...shut]));
		} catch {
			// No storage (a private window): folds last for the page.
		}
	};

	export const isFoldOpen = (id: string): boolean => !shut.has(id);

	export const setFoldOpen = (id: string, open: boolean): void => {
		if (open) shut.delete(id);
		else shut.add(id);
		persist();
	};

	/** Opens every one of `ids` (the folds on the way to something). Returns whether any was shut. */
	export const openFolds = (ids: readonly string[]): boolean => {
		let opened = false;
		for (const id of ids) {
			if (shut.delete(id)) opened = true;
		}
		if (opened) persist();
		return opened;
	};
</script>

<script lang="ts">
	import type { Snippet } from "svelte";

	import Section from "@samthesomebody/kit/components/section.svelte";

	/* A kit Section that folds, its fold remembered by `id` in the store
	   above. Untitled, it is the bare rule and doesn't fold. */
	let {
		id,
		title,
		actions,
		children,
	}: {
		/** What the fold is remembered by. */
		id: string;
		title: string;
		/** Badges and keys before the twisty. */
		actions?: Snippet;
		children: Snippet;
	} = $props();
</script>

{#if title === ""}
	<Section>{@render children()}</Section>
{:else}
	<Section {title} status={actions} bind:open={() => isFoldOpen(id), (next) => setFoldOpen(id, next === true)}>
		{@render children()}
	</Section>
{/if}
