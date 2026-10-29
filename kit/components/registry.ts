/* A registry that resolves a target to an entry: the entry the target
 * names outright, else the highest positive `match`, ties going to the last
 * registered. The kit's type editors (`editors.ts`) are one; a tool whose
 * entries carry more than an editor keeps its own entry shape on it. No DOM. */

export interface Registry<TTarget, TEntry extends { readonly id: string }> {
	/** Adds an entry, or replaces the one with its id. Returns the undo. */
	register(entry: TEntry): () => void;
	resolve(target: TTarget): TEntry | undefined;
	list(): readonly TEntry[];
}

export const createRegistry = <
	TTarget,
	TEntry extends { readonly id: string; readonly match: (target: TTarget) => number },
>(options: {
	/** The entry a target names outright, if any. */
	readonly named: (target: TTarget) => string | undefined;
	/** Built-ins, made on first use so module cycles never read a component early. */
	readonly builtIns: () => readonly TEntry[];
}): Registry<TTarget, TEntry> => {
	const entries: TEntry[] = [];
	let seeded = false;
	const seed = (): void => {
		if (seeded) return;
		seeded = true;
		entries.unshift(...options.builtIns());
	};
	return {
		register: (entry) => {
			seed();
			const existing = entries.findIndex((candidate) => candidate.id === entry.id);
			if (existing !== -1) entries.splice(existing, 1);
			entries.push(entry);
			return () => {
				const index = entries.indexOf(entry);
				if (index !== -1) entries.splice(index, 1);
			};
		},
		resolve: (target) => {
			seed();
			const name = options.named(target);
			if (name !== undefined) {
				for (let index = entries.length - 1; index >= 0; index--) {
					const entry = entries[index];
					if (entry?.id === name) return entry;
				}
			}
			let best: TEntry | undefined;
			let bestScore = 0;
			for (const entry of entries) {
				const score = entry.match(target);
				if (score > 0 && score >= bestScore) {
					best = entry;
					bestScore = score;
				}
			}
			return best;
		},
		list: () => {
			seed();
			return [...entries];
		},
	};
};
