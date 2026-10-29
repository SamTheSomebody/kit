---
"@samthesomebody/kit": minor
"@samthesomebody/dock": patch
---

Fix layout bugs found across kit consumers.

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
