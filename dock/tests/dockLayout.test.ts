// Three-tier dock layout persistence. The tiers exist because each has been
// needed in anger: CURRENT so a reload keeps your arrangement, DEFAULT so you
// can declare a starting point, FACTORY so a bad default is escapable.
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDockLayoutStore, dockLayoutJson, usableLayout } from "../dockLayout.ts";

const FACTORY = JSON.stringify({ v: 1, layout: { leaf: true, id: "L1", tabs: ["a"], active: "a" }, floating: [] });
const ARRANGED = JSON.stringify({ v: 1, layout: { leaf: true, id: "L9", tabs: ["b"], active: "b" }, floating: [] });

const stubStorage = () => {
	const map = new Map<string, string>();
	return {
		getItem: (key: string) => map.get(key) ?? null,
		setItem: (key: string, value: string) => map.set(key, value),
		removeItem: (key: string) => map.delete(key),
		size: () => map.size,
	};
};

let storage: ReturnType<typeof stubStorage>;

beforeEach(() => {
	storage = stubStorage();
	(globalThis as { localStorage?: unknown }).localStorage = storage;
});

afterEach(() => {
	delete (globalThis as { localStorage?: unknown }).localStorage;
});

const store = (applied: string[] = [], notes: string[] = [], live?: () => string | undefined) =>
	createDockLayoutStore({
		namespace: "test.dock",
		factory: () => FACTORY,
		serialize: live ?? (() => undefined),
		apply: (json) => applied.push(json),
		notify: (text) => notes.push(text),
	});

const row = (items: ReturnType<ReturnType<typeof store>["menu"]>, label: string) => {
	const found = items.find((item) => item.label === `Layout/${label}`);
	expect(found, label).toBeDefined();
	return found!;
};

describe("dock layout store", () => {
	it("starts at factory with nothing stored", () => {
		expect(store().starting()).toBe(FACTORY);
	});

	it("prefers the remembered layout, then the default, then factory", () => {
		const layouts = store();
		layouts.menu();
		storage.setItem("test.dock.default", ARRANGED);
		expect(layouts.starting()).toBe(ARRANGED);
		const other = JSON.stringify({ v: 1, layout: { leaf: true, id: "L5", tabs: ["c"], active: "c" }, floating: [] });
		storage.setItem("test.dock.layout", other);
		expect(layouts.starting()).toBe(other);
	});

	it("saves the LIVE layout as the default, not the last remembered one", () => {
		// A session that has not been rearranged yet has nothing stored; the
		// live tree is still what the user is looking at and asking to keep.
		const notes: string[] = [];
		const layouts = store([], notes, () => ARRANGED);
		row(layouts.menu(), "Save").run?.();
		expect(storage.getItem("test.dock.default")).toBe(ARRANGED);
		expect(notes).toEqual(["layout saved as default"]);
	});

	it("resetting to the default applies it and remembers it as current", () => {
		const applied: string[] = [];
		const layouts = store(applied);
		storage.setItem("test.dock.default", ARRANGED);
		row(layouts.menu(), "Reset").run?.();
		expect(applied).toEqual([ARRANGED]);
		expect(storage.getItem("test.dock.layout")).toBe(ARRANGED);
	});

	it("offers no reset or forget while no default is saved", () => {
		const items = store().menu();
		expect(row(items, "Reset").disabled).toBe(true);
		expect(row(items, "Forget").disabled).toBe(true);
		storage.setItem("test.dock.default", ARRANGED);
		const withDefault = store().menu();
		expect(row(withDefault, "Reset").disabled).toBe(false);
	});

	it("resets to factory even when the saved default is the thing that is broken", () => {
		const applied: string[] = [];
		const layouts = store(applied);
		storage.setItem("test.dock.default", '{"v":1,"layout":null,"floating":[]}');
		row(layouts.menu(), "Default").run?.();
		expect(applied).toEqual([FACTORY]);
	});

	it("forgetting the default leaves the current layout alone", () => {
		const layouts = store();
		storage.setItem("test.dock.default", ARRANGED);
		storage.setItem("test.dock.layout", FACTORY);
		row(layouts.menu(), "Forget").run?.();
		expect(storage.getItem("test.dock.default")).toBeNull();
		expect(storage.getItem("test.dock.layout")).toBe(FACTORY);
	});

	it("skips a stored layout with no panes in it", () => {
		// It restores faithfully and leaves nothing to right-click, so the
		// menu that would reset it is unreachable (lobby, 2026-09-03).
		expect(usableLayout('{"v":1,"layout":null,"floating":[]}')).toBeUndefined();
		expect(usableLayout("not json")).toBeUndefined();
		expect(usableLayout(undefined)).toBeUndefined();
		expect(usableLayout(FACTORY)).toBe(FACTORY);
		storage.setItem("test.dock.layout", '{"v":1,"layout":null,"floating":[]}');
		storage.setItem("test.dock.default", ARRANGED);
		expect(store().starting()).toBe(ARRANGED);
	});

	it("keeps the tiers wherever the tool says, not only in localStorage", () => {
		// The compare workbench's host picks its port at run time, so its
		// `localStorage` is a fresh empty bucket on every launch and the saved
		// layout has to live somewhere the origin cannot move out from under.
		const kept = new Map<string, string>();
		const layouts = createDockLayoutStore({
			namespace: "test.dock",
			factory: () => FACTORY,
			serialize: () => ARRANGED,
			apply: () => undefined,
			storage: {
				read: (key) => kept.get(key),
				write: (key, value) => (value === null ? kept.delete(key) : kept.set(key, value)),
			},
		});
		layouts.remember(ARRANGED);
		expect(kept.get("test.dock.layout")).toBe(ARRANGED);
		expect(storage.size()).toBe(0);
		row(layouts.menu(), "Save").run?.();
		expect(kept.get("test.dock.default")).toBe(ARRANGED);
		expect(layouts.starting()).toBe(ARRANGED);
		row(layouts.menu(), "Forget").run?.();
		expect(kept.has("test.dock.default")).toBe(false);
	});

	it("survives storage that throws on every access", () => {
		(globalThis as { localStorage?: unknown }).localStorage = {
			getItem: () => {
				throw new Error("blocked");
			},
			setItem: () => {
				throw new Error("blocked");
			},
			removeItem: () => {
				throw new Error("blocked");
			},
		};
		const layouts = store();
		expect(layouts.starting()).toBe(FACTORY);
		expect(() => layouts.remember(ARRANGED)).not.toThrow();
		expect(() => row(layouts.menu(), "Default").run?.()).not.toThrow();
	});
});

// The FACTORY tier is a checked-in `layout.json`, so what it hands the dock is
// a document plus the tab lists only the running tool knows.
describe("a factory layout read from a file", () => {
	const document = {
		v: 1,
		layout: {
			split: "row",
			ratio: 0.5,
			a: { leaf: true, id: "L0", tabs: ["records"], active: "records" },
			b: { leaf: true, id: "L1", tabs: ["@tools"], active: "@tools" },
		},
		floating: [],
	};

	it("passes a document with no placeholders straight through", () => {
		expect(dockLayoutJson({ v: 1, layout: { leaf: true, id: "L1", tabs: ["a"], active: "a" }, floating: [] })).toBe(
			FACTORY,
		);
	});

	it("fills a placeholder with the list it is handed, in place", () => {
		const filled = JSON.parse(dockLayoutJson(document, { tools: ["tool:art", "tool:plan"] })) as {
			layout: { b: { tabs: string[]; active: string } };
		};
		expect(filled.layout.b.tabs).toEqual(["tool:art", "tool:plan"]);
		// An `active` placeholder resolves to that list's first tab.
		expect(filled.layout.b.active).toBe("tool:art");
	});

	it("leaves an empty list as a pane with no active tab", () => {
		// The lobby with no tools in its registry: a leaf the dock detaches,
		// which is what the hand-written seed did too.
		const filled = JSON.parse(dockLayoutJson(document, { tools: [] })) as {
			layout: { b: { tabs: string[]; active: string | null } };
		};
		expect(filled.layout.b.tabs).toEqual([]);
		expect(filled.layout.b.active).toBeNull();
	});

	it("does not write to the document it was handed", () => {
		// An import is evaluated once, so the module object is shared by every
		// call — filling it in place would leave the second call reading the
		// first call's tabs.
		dockLayoutJson(document, { tools: ["tool:art"] });
		expect(document.layout.b.tabs).toEqual(["@tools"]);
	});

	it("fills placeholders inside a floating window too", () => {
		const floated = {
			v: 1,
			layout: { leaf: true, id: "L0", tabs: ["records"], active: "records" },
			floating: [
				{
					id: "F1",
					x: 0,
					y: 0,
					w: 300,
					h: 200,
					z: 1,
					root: { leaf: true, id: "L1", tabs: ["@tools"], active: "@tools" },
				},
			],
		};
		const filled = JSON.parse(dockLayoutJson(floated, { tools: ["tool:art"] })) as {
			floating: { root: { tabs: string[] } }[];
		};
		expect(filled.floating[0]?.root.tabs).toEqual(["tool:art"]);
	});

	it("throws on a placeholder no list was given for", () => {
		// Silently dropping it seeds an empty pane, which reads as a layout bug
		// rather than as the typo it is.
		expect(() => dockLayoutJson(document, { toolz: ["tool:art"] })).toThrow(/@tools/);
	});

	it("throws on a document with no panes in it", () => {
		expect(() => dockLayoutJson({ v: 1, layout: null, floating: [] })).toThrow(/no panes/);
	});
});
