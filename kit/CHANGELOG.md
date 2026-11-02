# @samthesomebody/kit

## 0.5.0

### Minor Changes

- 975bcca: Deep `.ts` paths are no longer exported: `@samthesomebody/kit/components/*.ts` and `@samthesomebody/kit/terminal/*.ts` are gone, as announced in 0.4. Use the entry points instead:
  
  - `@samthesomebody/kit/components`: control logic, `createRegistry`, the editor and property types, and the notification queue (`pushNotification` and friends, newly exported here)
  - `@samthesomebody/kit/editors`
  - `@samthesomebody/kit/tooltip`
  - `@samthesomebody/kit/terminal/core`
  - `@samthesomebody/kit/terminal`
  
  Components (`*.svelte`) and stylesheets (`*.css`) keep their paths.

### Patch Changes

- 07db945: `@samthesomebody/kit/terminal` exports `BuiltInLogLevel` too, as `@samthesomebody/kit/terminal/core` already did. Code that maps the five built-in levels onto something closed, such as `console` methods, needs it now that `LogLevel` accepts a tool's own levels.

## 0.4.0

### Minor Changes

- 6373098: Curated entry points, tool-defined log levels and a stricter kit-check:
  
  - **New entry points.** Logic is no longer reached through deep `.ts` files:
    - `@samthesomebody/kit/editors`: the type-editor registry (`editors`, `defineEditor`) and its types
    - `@samthesomebody/kit/tooltip`: the `tooltip` action
    - `@samthesomebody/kit/terminal/core`: the log model, link matcher and port types, without xterm
    - `@samthesomebody/kit/components` now also exports `createRegistry` and `Registry`, plus the editor and property types (type-only, so the index stays free of Svelte and CSS)
  
    Deep `.ts` paths such as `@samthesomebody/kit/components/editors.ts` still resolve in 0.4 but are deprecated and go away in 0.5.
  - **Log levels:**
    - `LogLevel` accepts a tool's own levels (any string), and the built-ins are now `BuiltInLogLevel`
    - `countByLevel` counts every level it sees
    - a tool's level is coloured from its CSS through the `log-line <level>` and `log-level <level>` classes
  - **Status dot.** It is `.kit-status-dot`; `.dock-tab-dot` stays as an alias.
  - **kit-check:**
    - named colours (in properties that take a colour) and the `font` shorthand are findings, and `uppercase` matches in any case
    - `--update` refuses to grow the baseline without `--force`
    - an exclude path with a trailing slash works
    - a malformed `package.json` or baseline stops the check instead of being treated as missing
    - unknown options are errors, and there is a `--help`
  
    The stricter rules can find things a baseline didn't hold; lock them in deliberately with `kit-check --update --force`, or fix them.

## 0.3.2

### Patch Changes

- a42db8b: Robustness fixes from the kit / dock / panels review:
  
  - **Every control loads the CSS it draws with.** Each component imports `controls.css` (the shared layer: surface variables, status dot, drag cursors, scrollbars), plus `layout.css` for Pane and Row and `tooltip.css` for Property. A control imported on its own, without `components/index.css`, now renders fully. Before, a menu had no background or border. A new test checks each component against its imports. panels' Console loads `controls.css` too.
  - **Field keeps the model's type.** Typing writes back the shape that was passed in: a number model takes only finite numbers, and a string model stays a string. Clearing a number field no longer writes `null`, and half-typed text such as "1.50" isn't rewritten under the caret. On blur the field shows the value again.
  - **Kit editors follow the property's value.** The number, string, vector and colour editors bind their fields to a draft that tracks the value, so a value the tool clamped or refused doesn't stay on screen after the field is left.
  - **Slider picks up new bounds.** It re-seeds when the `min`, `max`, limits or `elastic` passed to it change (an inspector reusing the slider for another object), while a re-render with the same props still leaves a grown elastic track alone. `reseedSlider` and `sameSliderBounds` are exported.
  - **Drags always end.**
    - Scrub ends on lost pointer capture, and unbinding mid-drag (a field unmounted or disabled) clears `body.scrubbing`.
    - Tree reorder, Scroll's rail and DualSlider also end on `pointercancel` and window blur. Tree clears `body.reordering` if it unmounts mid-drag.
    - DualSlider no longer divides by zero when `min === max`.
  - **Scroll** re-measures when its content or size changes (it only did on scroll), and uses `$props.id()` instead of a random id.
  - **Keyboard:**
    - Tree and Table put the first row in the tab order while nothing is selected.
    - Tree arrow keys move focus with the selection.
    - Table no longer selects disabled rows.
    - Confirm focuses its cancel key on open, keeps Tab inside, and gives focus back on close.
    - Segment is a `group` of toggle keys. It was a `radiogroup` with no radio children.

## 0.3.1

### Patch Changes

- f8c1c94: Bug fixes from the kit / dock / panels review:
  
  - **dock**
    - Re-rendering no longer scrolls every pane back to the top. A tab click in one pane used to reset the scroll of the others, including scrollers inside a pane's content.
    - A stored layout that is not a valid tree no longer stops the dock from mounting. `hydrate` (on the core and on the handle) returns `false` and leaves the current layout as it is. `usableLayout` uses the same check, so the store falls back to the next tier.
    - Repairs on hydrate:
      - a split ratio outside (0, 1) becomes 0.5
      - a tab id that appears twice keeps its first place
      - a stale `active` falls back to the leaf's first tab
      - a missing `floating` list becomes empty
    - Float z values are re-ranked instead of only counting up. Raising floats often, or reloading a saved layout, no longer pushes them above the drop preview and the context menu.
    - Listeners on the stage and the window are removed on `destroy`. A foreign drag that ends outside the dock clears the divider shield.
  - **panels**
    - Hierarchy: folding a branch above the selected node now stays folded, and edits that rebuild `nodes` don't reopen it.
    - Hierarchy: nothing is saved before the tree has been seeded, so a mount before the nodes arrive no longer saves "nothing open".
    - Hierarchy: changing `persist` loads that key's own folds instead of writing the previous key's under it.
    - Console: rows are keyed by `seq`, so two entries with the same `id` no longer crash the pane.
  - **kit**
    - Tree: the twisty's accessible name is "Expand <label>" or "Collapse <label>". It used to be the literal text `Expand {row.node.label}`.
    - Menu: a row's `hint` is never rendered as HTML. It can be a list of keys (as dock passes them). A string made only of `<kbd>` runs is read as keys, and any other string is shown as text. `hintParts` is exported.
    - `createRegistry`: undoing a registration that replaced an entry (a built-in editor, say) puts that entry back in its old place, instead of leaving the id with no entry.
- 431966c: Packaging fixes:
  
  - The `svelte` peer range is now `^5.28.0`. That is the oldest Svelte every component compiles on; some failed below 5.9, which `^5.0.0` allowed.
  - dock and panels list `@samthesomebody/kit` as a peer dependency instead of a dependency, so an app always shares one copy of kit with them: one editor registry and one set of styles. Install kit beside them, as the READMEs already say.
  - kit no longer publishes its tests, `components/tsconfig.json`, a stray private `components/package.json` or `cssAllow.json`.

## 0.3.0

### Minor Changes

- 4c2dae2: Fix layout bugs found across kit consumers.
  
  - `Row recipe="toolbar" wrap="nowrap"` no longer wraps (the recipe's own `flex-wrap` beat it).
  - A field block (Select, labelled Field) inside a `Slot` takes the slack like a bare field does.
  - `hidden` hides layout boxes, `.btn` and `.kit-segment` (their `display` beat the UA rule).
  - `Slider` follows a value written from outside, except while its field is being edited.
  - `svelte` export condition on kit and dock, so Vite no longer needs `optimizeDeps.exclude`.
  - `tokens.css` is now `vars.css` (fonts and `:root` variables) plus `base.css` (page resets); load `vars.css` alone on a page the tool doesn't own.
  - `kit-check` bin: holds a consumer's tool chrome to six rules (color, structure, kit-override, type, radius, native-control). Scope it with `kitCheck.include` in package.json. Exceptions need `kit-allow <rule>: <reason>`, and existing findings sit in a baseline that only shrinks.
  - `SKILL.md` ships in the package: the intent-to-recipe table and the kit-check rules, for agents.
  - The layout.css ↔ cssAllow.json freeze is now a kit test.
  - Tree rows carry `kind` (the trailing muted column, hidden when it repeats the label), `note` (muted secondary text), `badges` and `muted`, plus a `trailing` snippet. New `filterTree`, `ancestorIds`, `branchIds`, `nodeCount` and `treeNodeMatches`.
  - Log entries gain optional `id`, `detail` and `standing`; `collapseEntries` and `entryKey` are new. `terminal/*.ts` is exported so a Svelte console can share the log model.
  - `Section` folds when given a bindable `open`: a twisty after its status closes the body. A section inside another's body titles muted.
  - Type editors for properties: `Property` (a label | editor line with message, `below` and `status`) and `PropertyEditor`, which draws a property with the editor registered for its type. `editors.ts` holds the built-ins (number with slider, boolean, enum, string, vector, colour, and a read-only fallback); `registry.ts` has `createRegistry`, the mechanism tools can reuse for their own entries.

### Patch Changes

- a0530f3: Publish current workspace surface for kit and dock.

## 0.2.3

### Patch Changes

- Publish current workspace surface for kit and dock.
