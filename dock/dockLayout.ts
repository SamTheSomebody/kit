/**
 * Three-tier dock layout persistence, shared by every dock tool.
 *
 *   FACTORY   `layout.json` beside the app — what the tool ships with
 *   DEFAULT   what this user saved as their own starting point
 *   CURRENT   the live arrangement, rewritten on every structural change
 *
 * "Reset" is current ← default, and default falls back to factory when
 * unset — with a reset to factory as well, because a saved default can itself
 * be bad and there must be a way back that is not editing localStorage by
 * hand.
 *
 * The kit deliberately knows nothing about persistence (it hands you
 * `serialize()` and a `change` event and stops there), so this is the
 * consumer half of that seam — and it is identical in every tool, which is
 * why it lives here rather than in each one.
 */
import type { DockMenuItem } from "./index.ts";

/**
 * Where the DEFAULT and CURRENT tiers are kept. `localStorage` is the default
 * and is right for a tool served on a stable origin — every vite-served tool,
 * whose port is the worktree's own.
 *
 * It is WRONG for a tool whose host picks its port at run time: storage is
 * partitioned by origin, so `localhost:5794` and `localhost:5796` are two
 * empty buckets rather than one shared one, and such a tool opens on factory
 * however often it was saved. That is why the port is a `storage` seam and
 * not a hard-coded `localStorage` — the compare workbench hands one that
 * keeps the two tiers on its host instead (2026-09-07).
 */
type DockLayoutStorage = {
	read: (key: string) => string | undefined;
	write: (key: string, value: string | null) => void;
};

const browserStorage: DockLayoutStorage = {
	read: (key) => {
		if (typeof localStorage === "undefined") {
			return undefined;
		}
		try {
			return localStorage.getItem(key) ?? undefined;
		} catch {
			/* private mode, blocked site data: no stored layout is a fine answer */
			return undefined;
		}
	},
	write: (key, value) => {
		if (typeof localStorage === "undefined") {
			return;
		}
		try {
			if (value === null) {
				localStorage.removeItem(key);
			} else {
				localStorage.setItem(key, value);
			}
		} catch {
			/* storage full or blocked — the layout is a convenience, not state to guard */
		}
	},
};

/** Tab lists a factory layout names as `"@name"` and the app supplies. */
export type DockLayoutTabs = Record<string, readonly string[]>;

/**
 * A factory layout as READ FROM A FILE, which is looser than `DockSerialized`
 * in two ways that matter: a JSON module's literals widen (`"leaf": true`
 * types as `boolean`), and a `tabs` entry may still be a `"@name"`
 * placeholder. Only the fields the fill walks are named.
 */
type LayoutDocumentNode = {
	tabs?: string[];
	active?: string | null;
	a?: LayoutDocumentNode;
	b?: LayoutDocumentNode;
};

type LayoutDocument = {
	layout?: LayoutDocumentNode | null;
	floating?: { root?: LayoutDocumentNode }[];
};

const PLACEHOLDER = "@";

const listFor = (name: string, tabs: DockLayoutTabs): readonly string[] => {
	const list = tabs[name.slice(PLACEHOLDER.length)];
	if (list !== undefined) {
		return list;
	}
	const known = Object.keys(tabs).join(", ");
	throw new Error(`factory layout names "${name}", which no tab list was given for (given: ${known || "none"})`);
};

const fill = (node: LayoutDocumentNode, tabs: DockLayoutTabs): void => {
	if (node.a) {
		fill(node.a, tabs);
	}
	if (node.b) {
		fill(node.b, tabs);
	}
	if (node.tabs === undefined) {
		return;
	}
	node.tabs = node.tabs.flatMap((tab) => (tab.startsWith(PLACEHOLDER) ? [...listFor(tab, tabs)] : [tab]));
	if (typeof node.active === "string" && node.active.startsWith(PLACEHOLDER)) {
		node.active = listFor(node.active, tabs)[0] ?? null;
	}
};

/**
 * A layout with no panes at all is not worth restoring: it leaves nothing to
 * right-click, which puts the menu that would reset it out of reach. Found
 * the hard way in the lobby, 2026-09-03.
 */
export const usableLayout = (json: string | undefined): string | undefined => {
	if (json === undefined) {
		return undefined;
	}
	try {
		return JSON.stringify(JSON.parse(json)).includes('"leaf":true') ? json : undefined;
	} catch {
		return undefined;
	}
};

/**
 * The FACTORY tier is a file: `layout.json` beside the app, loaded with
 * `import factoryDocument from "./layout.json"` and handed here. This is what
 * turns that document into the string the dock hydrates.
 *
 * It was a `JSON.stringify({…})` literal inside every tool's `app.svelte`
 * until 2026-09-07, which made the one thing a reader might want to hand-edit
 * — where the panes start — the one thing they had to read Svelte to find.
 * The dock's serialized shape (`DockSerialized`) is already pure data, so a
 * seed has no reason to be code.
 *
 * TAB LISTS A TOOL ONLY KNOWS AT RUNTIME are the reason this is more than
 * `JSON.stringify`: the lobby's tools pane holds one tab per registry entry,
 * and the compare workbench names its panes after the two sides being
 * compared, so neither list can be typed into a file. A `tabs` entry written
 * as `"@name"` is replaced by the list handed in under `name`; an `active`
 * written that way resolves to the first tab of that list, or `null` when the
 * list is empty. Tab ids stay where they are built — in the app — and only
 * the ARRANGEMENT lives in the file.
 *
 * A placeholder no list was handed in for throws: the seed would otherwise
 * hydrate a pane holding a tab that does not exist, which reads as an empty
 * pane rather than as the typo it is.
 */
export const dockLayoutJson = (document: unknown, tabs: DockLayoutTabs = {}): string => {
	/* Through JSON and back: the document is a module object shared by every
	   call (an import is evaluated once), and filling placeholders writes to
	   it. Cloning also proves it is serializable before the dock sees it. */
	const seed = JSON.parse(JSON.stringify(document)) as LayoutDocument;
	if (seed.layout) {
		fill(seed.layout, tabs);
	}
	for (const float of seed.floating ?? []) {
		if (float.root) {
			fill(float.root, tabs);
		}
	}
	const json = JSON.stringify(seed);
	if (usableLayout(json) === undefined) {
		throw new Error("factory layout has no panes in it — a dock cannot hydrate a tree with no leaf");
	}
	return json;
};

export type DockLayoutStore = {
	/** What to hydrate on mount: current, else the saved default, else factory. */
	starting(): string;
	/** Record the live layout — wire to the dock's `change` event. */
	remember(json: string): void;
	/** The `Layout/…` rows for the dock's context menu. */
	menu(): DockMenuItem[];
};

export const createDockLayoutStore = (args: {
	/** Storage namespace, e.g. `"compare.dock"`. */
	namespace: string;
	/** The tool's seed layout. Called lazily so it can read live state. */
	factory: () => string;
	/** The dock's live layout — `handle.serialize()`. Read when saving a
	 *  default, because a session that has not been rearranged yet has
	 *  nothing stored and the live tree is still the answer. */
	serialize: () => string | undefined;
	/** Put a layout on screen. The store handles storing it. */
	apply: (json: string) => void;
	/** Where the two saved tiers go. `localStorage` unless the tool's host
	 *  moves between runs — see `DockLayoutStorage`. */
	storage?: DockLayoutStorage;
	notify?: (text: string) => void;
}): DockLayoutStore => {
	const currentKey = `${args.namespace}.layout`;
	const defaultKey = `${args.namespace}.default`;
	const { read, write } = args.storage ?? browserStorage;

	const applyAndStore = (json: string): void => {
		args.apply(json);
		write(currentKey, json);
	};

	return {
		starting: () => usableLayout(read(currentKey)) ?? usableLayout(read(defaultKey)) ?? args.factory(),
		remember: (json) => write(currentKey, json),
		menu: () => [
			{
				label: "Layout/Save",
				/* the rule between what the kit does to panes and what the tool
				   does to whole layouts — one folder, two halves */
				separator: true,
				run: () => {
					const current = args.serialize() ?? read(currentKey);
					if (current === undefined) {
						return;
					}
					write(defaultKey, current);
					args.notify?.("layout saved as default");
				},
			},
			{
				label: "Layout/Reset",
				disabled: read(defaultKey) === undefined,
				run: () => {
					const saved = read(defaultKey);
					if (saved) {
						applyAndStore(saved);
					}
				},
			},
			{
				label: "Layout/Default",
				run: () => applyAndStore(args.factory()),
			},
			{
				label: "Layout/Forget",
				disabled: read(defaultKey) === undefined,
				run: () => write(defaultKey, null),
			},
		],
	};
};
