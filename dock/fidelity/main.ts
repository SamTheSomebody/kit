/**
 * Fidelity harness entry — the component half of the artifact↔component
 * comparison (`docs/specs/2026-09-03-dock-kit-design.md` §Fidelity-check
 * plan). `?fixture=shell|collapsed|stub` picks the layout; both renderers
 * hydrate the same JSON, so a pixel diff can only be the port's doing.
 *
 * DEV harness only — nothing here ships to a consumer.
 */

import { createDock } from "../index";
import type { DockHandle } from "../types";
import { DOCK_EXTERNAL_MIME } from "../view";
import { demoTabs, mintExternal } from "./demoTabs";
import { FIXTURES, SHELL_FIXTURE } from "./fixtures";

const stage = document.querySelector<HTMLElement>("#stage")!;
const name = new URLSearchParams(location.search).get("fixture") ?? "shell";
const fixture = FIXTURES[name] ?? SHELL_FIXTURE;

/* the artifact's `mark()` / `toast()` seams are no-ops there; here they are
   the typed events port, recorded so the walk can assert the kit reports
   what it did without the kit rendering any feedback chrome of its own */
const marks: string[] = [];
const notices: string[] = [];
const changes: string[] = [];

const handle: DockHandle = createDock(stage, {
	tabs: demoTabs,
	state: JSON.stringify(fixture),
	on: {
		event: (kind) => marks.push(kind),
		notify: (text) => notices.push(text),
		change: (serialized) => changes.push(serialized),
	},
	external: {
		accepts: (dataTransfer) => [...dataTransfer.types].includes(DOCK_EXTERNAL_MIME),
		mint: () => mintExternal(),
	},
});

/* the fidelity walk drives the component through this seam, exactly as an
   agent pane drives the artifact through its own top-level globals */
(window as { __DOCK_FIDELITY__?: unknown }).__DOCK_FIDELITY__ = { handle, fixture: name, marks, notices, changes };
