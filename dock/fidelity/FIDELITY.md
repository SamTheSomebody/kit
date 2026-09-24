# Dock kit — fidelity check (phase 1)

Run 2026-09-03 against the signed artifact v53
(`https://claude.ai/code/artifact/46ed9eea-e762-4d39-9227-956a2a163340`, [HUMAN] Sam 2026-09-03).
Method and pass line: `docs/specs/2026-09-03-dock-kit-design.md` §Fidelity-check plan.

## How it runs

Both renderers are served by one dev server, from the repo root:

```bash
npx --no-install vite --config tools/ui/dock/fidelity/vite.config.ts
```

The config sets its own `root`, so that serves this directory on port 9843 whatever the shell's cwd,
and the kit takes no `vite` dependency for it. (`.claude/` is gitignored, so a `launch.json` entry
for the Browser pane is a local convenience, not part of the check.) It serves two pages:

- **reference** — `reference.html`, the frozen artifact document (verbatim; only the claude.ai
  hosting shim stripped). Its `hydrate` / `rerender` / `serialize` are top-level globals.
- **component** — `index.html` + `main.ts`, this package's `createDock` with the same demo tab
  registry (`demoTabs.ts`, ported verbatim) and the same tokens.

Both hydrate the same fixture (`fixtures.ts`), then `probe.js` is evaluated in each: it walks the
dock chrome and emits every element's class, text, stage-relative rect and computed
box/type/colour. **The pixel comparison is done in numbers** — the SHA-256 of the two probe
outputs. That is strictly stronger than a screenshot diff: it names the element and the property
that drifted, and it cannot be fooled by antialiasing or by masking the content panes.

## 0 · Revisions since the sign-off — no RULE divergence outstanding (one value does: §0c)

Six rules were corrected or added during phase-1 to phase-3 review ([HUMAN] Sam, all approved 2026-09-03,
spec §Revisions 1–6). Each was published **back into the artifact** and `reference.html` re-cut from it, so
the two renderers agree and this stays a plain identity test rather than a list of known differences.

| #   | Rule                                                                                           |
| --- | ---------------------------------------------------------------------------------------------- |
| 1   | a group-bar empty-area drop lands on the bar's own axis, beside the group                      |
| 2   | a collapsed split merges into one group only across axes — same-axis panes keep a chevron each |
| 3   | dbl-click / Enter space the whole axis evenly, not one divider to 50/50                        |
| 4   | the core stays framework-agnostic (a decision, recorded; no code change)                       |
| 5   | tab status lights (`DockTabStatus`)                                                            |
| 6   | the right-click menu, with submenus declared as file-system style paths                        |

Re-measured after the republish, 800×560, all four fixtures: **identical**.

```
shell 00ee901c608fde1f · collapsed c8c6519950b1bfc0 · stub ffc1486f06aeb7c3 · sideBySide dfc07b9401b82d69
```

Those hashes moved from the phase-1 values because the demo registries on both sides now exercise the
status lights (`log` busy, `sim` ok, `fences` warn). That is the check earning its keep: adding the
statuses to the artifact's registry and not the harness's diverged three of four fixtures immediately, and
the numbers named it before anything was shipped. `hashAll.js` runs all four in one pass on either page.

## 0c · Divergence outstanding — `--dock-min-pane` is 27px, the artifact's is 90 (2026-09-06)

[HUMAN] Sam: "The minimum panel height needs to be decreased as a standard to one label height." Done, in
the kit only: `DOCK_THEME.minPane` is 27 — `tabHeight` 26 plus the strip's 1px rule — so any pane can be
dragged back to just the row that names it. The signed artifact still carries `--dock-min-pane: 90px`
(`reference.html:44`), so the interaction row below ("drag divider →20 → exactly 90px") describes the
ARTIFACT and no longer the component: the component now clamps at 27, measured in the DEV shell at
810×1440 (a pane at exactly 27px, its label whole, on both axes).

This is a value divergence, not a rule one: nothing about how the clamp behaves changed, only the number
it clamps to, and every hash in §1 is taken at sizes far above either floor. It closes when the artifact
is next re-cut — the same queue `i-refresh` and the editor bar's icons are in.

## 0d · Divergence outstanding — a tab pane wears the control kit's drawn rail, growing inward (2026-09-09)

The pane's vertical scrollbar is no longer a dressed native bar: `.dock-body` is bound as a
`.kit-scroll` frame around `.dock-content` (`controls`' `bindScroll`), so a tab gets the rail the
control kit draws — always visible, reporting where the view is, thickening as the pointer nears —
and the reason is the same one that made the kit draw it: on macOS the native overlay bar is absent
until you are already scrolling, so a pane could not say it had more below. The signed dock artifact
carries the native bar (`reference.html`, `.dock-content::-webkit-scrollbar`), so the probe's colour
and box readings over a pane's trailing edge now describe the ARTIFACT and not the component.

**One rule of the CONTROL kit is bent here, and only here: the rail grows inward.** The kit grows it
outward from the frame's inner edge on the bargain that the 6px lands on whatever is beyond the pane.
A dock pane has no beyond — `.dock-body` clips — so every pixel of that growth was cut and the bar
could never be aimed at. `.dock-body.near > .kit-scroll-rail` takes the width from inside instead.

A tab's content gives the scrolling back to the tab: `.dock-content .kit-pane:not(.fill):not(.kit-pane
.kit-pane)` grows the outermost kit pane rather than letting it scroll itself, which is what puts hosts
that reach the kit through `tool-ui`'s `Pane` (the lobby's every tab) on the rail. The artifact has no
`.kit-pane` — it predates the control kit — so this adds a rule rather than diverging from one.

The HORIZONTAL bar stays native and stays dressed (`::-webkit-scrollbar:horizontal`, the same size and
colours it always had): the kit draws a vertical rail only, and its `display: none` is one rule for
both axes.

## 0b · Revision 5 — the estate restyle, published back 2026-09-06

The kit was restyled after the sign-off and the artifact was not republished with it, so for three days all
four fixtures diverged and §0's promise — that this is a plain identity test — did not hold. It holds again:
the artifact was republished ([HUMAN] Sam asked for it directly), `reference.html` re-cut from what came
back, and the pair re-measured.

**Three changes, all presentation, no rule touched.** Each was already the estate's decision; only the
artifact was behind.

| Property                   | Was        | Is         | Decision                                                                                                                                                                                       |
| -------------------------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text` (30 elements)       | `TIMELINE` | `Timeline` | labels are sentence case across the dock and console kits — the demo registry is re-cased on both sides, content rows included                                                                 |
| `letterSpacing` (89)       | `0.72px`   | `normal`   | tracking is a token now, `--dock-tab-tracking`, and its value is `0` — `.06em` was set for the caps that are gone                                                                              |
| `borderRadius` (6)         | `6px`      | `0px`      | squared, 2026-09-05 ([HUMAN] Sam: "none of the tools should have the card styles") — the float, its panes and the drop preview. The context menu keeps its radius; it is a control-kit surface |
| `width` (80) · `rect` (93) | —          | —          | downstream of the first two: a sentence-case label with no tracking measures narrower, so every tab, label and × moves                                                                         |

**Identical again — both renderers, both viewports, all four fixtures**, compared as full probe strings and
not merely as hashes:

```
@800×560    shell c70893ff5d6b17e5 · collapsed 0f27566276704d0a · stub ff34ac068230ac31 · sideBySide 571f6a273ed1d201
@1000×700   shell a222882eba3580dc · collapsed eb6802ba6892d9f2 · stub c081d69c9f859ad7 · sideBySide d311318dbd15e375
```

Those replace §0's numbers as the current record. §0's four are still exactly what the pre-restyle artifact
produces, and they were never stale — they were the reference's, the reference was frozen, and it
reproduced them bit for bit right up to the re-cut. What had moved was the component, away from them.

**What the check bought, twice over.** Before the republish, backing the three changes out at runtime made
the component byte-identical to the frozen reference — proving the divergence was those decisions and
**nothing else**, with no accidental drift hiding underneath. After it, the same identity holds with nothing
backed out. A hash table alone shows two numbers differing; it cannot say whether the cause is a restyle or
a regression, which is why the residual was measured both times rather than assumed.

Focus mode (spec §Revisions 7) is **not** in the artifact and does not need to be for this to pass: with
`hideSingleTabBars` off, `isBareLeaf` is the artifact's original root-solo expression exactly, so it cannot
move a fixture's render — and it was in the component build that produced both identities above. A future
revision that publishes the behaviour back into the artifact would be the thing that lets a fixture exercise
it.

## 1 · Same JSON, two renderers

Viewport 800×560 and 1000×700, three fixtures. Probe hash, reference vs component. **Phase-1 numbers, in
full-digest `head…tail` form** — §0 re-measured them after the status-light republish and §0b again after
the restyle; both later passes use `hashAll.js`'s 16-hex short form, so these do not compare directly:

| Fixture               | Covers                                                            | Hash                |           |
| --------------------- | ----------------------------------------------------------------- | ------------------- | --------- |
| `shell` @1000×700     | deep tree · 8-tab overflowing strip · two cover-fit panes · float | `7c9152f8…3aa036da` | identical |
| `collapsed` @1000×700 | structural group bar (row nesting flattened) · shaded float       | `41a043f2…6abb608c` | identical |
| `stub` @1000×700      | row-collapsed ▸ stub · expanded sibling                           | `c0ae882b…60e41e25` | identical |
| `stub` @800×560       | as above, second viewport                                         | `58a58e5c…dc430cbe` | identical |
| `shell` @800×560      | as above, second viewport                                         | `37aa5c8a…0b4cb376` | identical |
| `collapsed` @800×560  | as above, second viewport                                         | `3b1d2350…4816dfe5` | identical |
| `sideBySide` @800×560 | §0's rule 2 case: a collapsed `row` inside a `row`                | `dfc07b94…b2a73214` | identical |

Every chrome element matched in class, text, rect and all 34 probed computed properties. The `shell`,
`collapsed` and `stub` hashes never moved across any of the three revisions — re-measured after each — which
is the evidence that none of them reached beyond the rule it named. `sideBySide` was added to make rule 2
visible; it too now matches, measured after the artifact was re-published.

## 2 · Round-trip

`serialize → hydrate → serialize` is byte-identical for all three fixtures, in **both** renderers
and through a second fresh core (`tests/treeSerialize.test.ts` covers the DOM-free half).

## 3 · Interaction parity — real pointer / drag input

Driven with real mouse input (CDP), never synthetic `DragEvent`s. Where a gesture was run on both
renderers, the serialized state after it was compared byte-for-byte.

| Rule                                    | Gesture                                    | Result                                                                                                            |
| --------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| TABS · click selects + expands          | click CONFIG                               | `active="config"` ✓                                                                                               |
| TABS · active-tab click collapses       | click CONFIG again                         | `collapsed=<seq>`, row-parent → 26px ▸ stub ✓                                                                     |
| COLLAPSE · stub reopens                 | click ▸                                    | expands on the same tab ✓                                                                                         |
| TABS · overflow chevron                 | click › ×3                                 | pages the selection; `.can-l`/`.can-r` toggle; active tab re-centers to the exact centering offset ✓              |
| SPLITS · sash drag                      | drag divider 240→400                       | ratio 0.5000 ✓ (pointer capture works with real pointer events)                                                   |
| SPLITS · min-pane clamp                 | drag divider →20                           | ratio 0.112641 = exactly 90px ✓                                                                                   |
| SPLITS · dbl-click evens the axis       | double-click divider                       | 25/25/50 → a third each (266/266/266, ratios .6667/.5000), from either divider — **identical both renderers** ✓ ‡ |
| DROP · body edge band                   | tab → pane's left 30%                      | new row split, source leaf loses the tab — **identical both renderers** ✓                                         |
| DROP · strip join at index              | tab → another strip                        | joins at the pointer index — **identical** ✓                                                                      |
| DROP · edge drop INSIDE a float         | tab → float body top band                  | float root becomes a col split — **identical** ✓                                                                  |
| DROP · root band                        | tab → outer 12px                           | whole docked tree becomes one side — **identical** ✓                                                              |
| DROP · root band is ⇧-gated over strips | tab → strip at y=12 (inside the 12px band) | joined the strip, did **not** root-split ✓                                                                        |
| DROP · group bar cell title             | click PAYTABLE in the bar                  | reopens that pane on that tab — **identical** ✓                                                                   |
| DROP · group bar empty area             | tab → bar's empty area                     | new pane beside the group, never a join — **identical both renderers** ✓ ‡                                        |
| FLOATS · grip move                      | drag ⠿                                     | window moves, never dock-assigns — **identical** ✓                                                                |
| FLOATS · resize                         | drag SE corner                             | opposite edge anchored — **identical** ✓                                                                          |
| FLOATS · shade                          | click float strip empty area               | `.shaded`, width shrinks to the strip (75px) — **identical** ✓                                                    |
| COLLAPSE · guard, swap                  | collapse the last open docked pane         | previously-collapsed pane reopens instead ✓                                                                       |
| COLLAPSE · guard, refusal               | same on a single root leaf                 | collapse refused, `notify("one pane always stays open")` ✓                                                        |
| EXTERNAL · `effectAllowed:"copyMove"`   | real drag from a foreign source            | tab minted and joined ✓                                                                                           |
| EXTERNAL · `effectAllowed:"move"`       | same drag, narrower effectAllowed          | **browser cancels the drop, silently** — the documented failure mode, reproduced                                  |

The last row is the point of insisting on real input: it is invisible to synthetic `DragEvent`s
(memory `synthetic-dragevents-skip-effectallowed-gating`), and it is now written into
`DockExternalPort`'s own docs as a consumer requirement.

**‡** Every row was driven with real input when first measured, these two included. They were re-measured
after the artifact was re-published, and by then the agent pane had stopped delivering real drags and
double-clicks altogether — the same gesture that had worked earlier moved nothing, **on both renderers
equally**, while `elementFromPoint` still resolved to the divider and a dispatched event still worked. So
the re-measurement used `parity.js`: identical synthetic input to both pages, comparing them to each other
rather than proving a real gesture. That is a sound parity test and a weak reality test, which is why it is
marked. Both returned byte-identical results:

```
barDrop     row{timeline+config+assets , col{game , row{row{ref-a(c) , ref-b+paytable(c)} , log}}}
evenSplit   L1:266 | L2:266 | L3:266        ratios 0.6667 / 0.5000
```

Whoever next has real input on this page should re-drive those two rows.

## Not driven, and why

- **⇧-gated paths** (force-float, doubled root band, root band over a strip _with_ ⇧). The agent
  pane's input bridge does not carry modifier state into the HTML5 drag stream — a `shift` drag
  arrives at `dragover` with `shiftKey === false`, so the gesture takes the unshifted branch. The
  unshifted half of each rule is covered above. The ⇧ decision itself is locked in
  `dock/tests/dropZone.test.ts` (`shiftKey` + band px, no HTML5 stream). Whoever next has a real
  keyboard on this page can still walk the four visual rows.
- **Middle-click close.** The pane exposes no middle button. The `auxclick` handler is present and
  identical to the artifact's.
- **Real drags and double-clicks, after the artifact re-publish.** The agent pane's input driver stopped
  delivering them mid-session — see the ‡ note above. Nothing about the pages changed; the control was the
  component reproducing the same dead gesture it had performed successfully an hour earlier.

## Re-running it

Start the server with the command above, open both pages — `/` (component, `?fixture=shell|collapsed|stub`)
and `/reference.html` (artifact) — hydrate the same fixture JSON into each, and in each:

```js
const source = await (await fetch('/probe.js')).text();
const probe = eval(source);
crypto.subtle.digest('SHA-256', new TextEncoder().encode(probe));
```

If the published artifact changes after the sign-off, the sign-off re-opens (spec
§Fidelity-check plan) and `reference.html` is re-cut from it.
