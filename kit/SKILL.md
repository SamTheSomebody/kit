---
name: kit
description: Use when building or changing tool UI on @samthesomebody/kit or @samthesomebody/dock, including pane layout, controls and the dock shell. Covers picking a recipe and running kit-check. Not for game HUDs.
---

# Tool chrome on the kit

Layout and formatting are the kit's decisions, not yours. Pick a recipe and a control, write no structural CSS, and run `kit-check`.

## Pick by intent

| Intent                                | Use                                                                                                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Label left, control right, many lines | `Column recipe="fields"`, one `Row` per line                                                                                                                            |
| Strip of buttons, chips or filters    | `Row recipe="toolbar"` (`wrap="nowrap"` to keep one line)                                                                                                               |
| Vertical groups in a pane             | `Column recipe="stack"` + `Section`                                                                                                                                     |
| Side-by-side stacks                   | `Columns`, then one `Column` each                                                                                                                                       |
| The control takes the line's slack    | `Slot size="fill"` around it                                                                                                                                            |
| Key/value readout                     | `Meta`                                                                                                                                                                  |
| A log or console                      | `@samthesomebody/panels`: `Console` + `ConsoleLines` (+ `ConsoleBar`, `ConsoleInput`, `ConsoleDetail`); share a `ConsoleView` across panes                              |
| A scene or object tree                | panels `Hierarchy` (kit `Tree` rows: `label`, `note`, `kind`, `badges`, `muted`, `trailing`)                                                                            |
| Edit the selected thing               | panels `Inspector` > `Container size="fill"` > panels `InspectorSection` > `Column recipe="fields"` > `Property` + `PropertyEditor`; add a type with `editors.register` |
| Scrolling pane body                   | `Container size="fill"`                                                                                                                                                 |
| Canvas, iframe or video               | the stage, not layout                                                                                                                                                   |
| Splits, tabs and floats               | `Dock`                                                                                                                                                                  |

The primitives are `Container`, `Columns`, `Column`, `Row` and `Slot`. Their props are `size` (`fit`, `fill` or `fill(N%)`), `recipe` (`fields`, `toolbar` or `stack`), `place` (`pack`, `center` or `stretch`) and `wrap`. Gaps are `--dock-pad`; nothing else spaces things.

Whole panes (Console, Hierarchy, Inspector) come from `@samthesomebody/panels`, which composes kit; kit never imports it.

The controls are `Button` (two states: `checked`), `IconButton`, `Segment` (three or more states), `Field`, `Select`, `Slider`, `Checkbox`, `Tree`, `Table`, `Meta`, `Section`, `Label`, `Badge`, `Scroll` and `Pane`. Use sentence case everywhere. Hide something with `hidden`.

## kit-check

`kit-check` (the kit's bin) checks the folders listed in `package.json` → `kitCheck.include`. It has six rules:

- **color**: no colour literals; use `--tool-*`.
- **structure**: no flex, grid, gap, margin, padding or alignment CSS.
- **kit-override**: no selectors on `.kit-*`, `.btn` or `.dock-*`.
- **type**: `--tool-font` and `--tool-font-size-*` only, and no uppercase.
- **radius**: no rounded corners.
- **native-control**: no `<button>`, `<select>`, `<input>`, `<textarea>` or `<table>`; use the kit control.

Findings that were there when a project adopted the check sit in `kit-check.baseline.json`. The baseline only shrinks: after fixing one, run `kit-check --update`. Never raise it.

When the kit really has no answer, don't hand-roll one quietly. Mark the exception at the line, with a reason:

```css
/* kit-allow structure: the game canvas fills its frame */
```

```svelte
<!-- kit-allow native-control: OS colour picker, the kit has no swatch -->
```

A `kit-allow` covers the next declaration, element or (above a selector) block. Every one marks a kit gap to promote.
