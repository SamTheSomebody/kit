/**
 * Fidelity fixtures — the contract of record for the artifact↔component
 * comparison (`docs/specs/2026-09-03-dock-kit-design.md` §Fidelity-check
 * plan). Each is a serialized layout hydrated into BOTH renderers: the
 * signed artifact (its `hydrate`/`rerender` are top-level globals) and this
 * package's `createDock`. Chrome regions are then compared pixel-wise, and
 * `serialize → hydrate → serialize` must be byte-identical either side.
 *
 * The ids are pinned, not generated, so the two renderers agree on every
 * `data-leaf` / float id and a diff can never be blamed on numbering.
 */

/** The artifact's own boot layout: a deep tree, an overflowing 8-tab strip,
 *  two cover-fit panes, and one float. */
export const SHELL_FIXTURE = {
	v: 1,
	layout: {
		split: "row",
		ratio: 0.3,
		a: {
			leaf: true,
			id: "L1",
			tabs: ["timeline", "config", "assets", "paytable", "fences", "books", "sim", "notes"],
			active: "timeline",
		},
		b: {
			split: "col",
			ratio: 0.6,
			a: { leaf: true, id: "L2", tabs: ["game"], active: "game" },
			b: {
				split: "row",
				ratio: 0.5,
				a: { leaf: true, id: "L3", tabs: ["ref-a"], active: "ref-a" },
				b: { leaf: true, id: "L4", tabs: ["ref-b"], active: "ref-b" },
			},
		},
	},
	floating: [
		{ id: "F1", x: 420, y: 380, w: 360, h: 220, z: 21, root: { leaf: true, id: "L5", tabs: ["log"], active: "log" } },
	],
};

/** The spec's named case: splits + a fully-collapsed split (structural group
 *  bar, with a row nesting that must FLATTEN into it) + a shaded float.
 *  `collapsed` values are the collapse sequence №s — ref-b outranks ref-a,
 *  so the group's reopener is ref-b. */
export const COLLAPSED_FIXTURE = {
	v: 1,
	layout: {
		split: "row",
		ratio: 0.3,
		a: { leaf: true, id: "L1", tabs: ["timeline", "config", "assets"], active: "timeline" },
		b: {
			split: "col",
			ratio: 0.6,
			a: { leaf: true, id: "L2", tabs: ["game"], active: "game" },
			b: {
				split: "row",
				ratio: 0.5,
				a: { leaf: true, id: "L3", tabs: ["ref-a"], active: "ref-a", collapsed: 1 },
				b: { leaf: true, id: "L4", tabs: ["ref-b", "paytable"], active: "ref-b", collapsed: 2 },
			},
		},
	},
	floating: [
		{
			id: "F1",
			x: 420,
			y: 380,
			w: 360,
			h: 220,
			z: 21,
			root: { leaf: true, id: "L5", tabs: ["log"], active: "log", collapsed: 3 },
		},
	],
};

/** A row-collapsed pane (▸ stub) beside an expanded one, and a root-solo
 *  float — the two chrome forms the other fixtures do not reach. */
export const STUB_FIXTURE = {
	v: 1,
	layout: {
		split: "row",
		ratio: 0.3,
		a: { leaf: true, id: "L1", tabs: ["timeline", "config"], active: "timeline", collapsed: 1 },
		b: { leaf: true, id: "L2", tabs: ["game"], active: "game" },
	},
	floating: [
		{ id: "F1", x: 420, y: 380, w: 360, h: 220, z: 21, root: { leaf: true, id: "L5", tabs: ["log"], active: "log" } },
	],
};

/** [HUMAN] Sam's case, 2026-09-03: `ref a | ref b | paytable` side by side,
 *  with the two refs collapsed. They are a `row` inside a `row`, so the
 *  collapsed pair must NOT merge into one chevron — the strip reads
 *  `▸ | ▸ | paytable`, each pane keeping its own expander, drag source and
 *  drop target. The artifact merges them to `▸ | paytable`; this is the
 *  fixture that pins the difference (spec §Revisions 2). */
export const SIDE_BY_SIDE_FIXTURE = {
	v: 1,
	layout: {
		split: "row",
		ratio: 0.3,
		a: { leaf: true, id: "L1", tabs: ["timeline", "config"], active: "timeline" },
		b: {
			split: "col",
			ratio: 0.6,
			a: { leaf: true, id: "L2", tabs: ["game"], active: "game" },
			b: {
				split: "row",
				ratio: 0.5,
				a: {
					split: "row",
					ratio: 0.5,
					a: { leaf: true, id: "L3", tabs: ["ref-a"], active: "ref-a", collapsed: 1 },
					b: { leaf: true, id: "L4", tabs: ["ref-b"], active: "ref-b", collapsed: 2 },
				},
				b: { leaf: true, id: "L6", tabs: ["paytable"], active: "paytable" },
			},
		},
	},
	floating: [],
};

export const FIXTURES: Record<string, unknown> = {
	shell: SHELL_FIXTURE,
	collapsed: COLLAPSED_FIXTURE,
	stub: STUB_FIXTURE,
	sideBySide: SIDE_BY_SIDE_FIXTURE,
};
