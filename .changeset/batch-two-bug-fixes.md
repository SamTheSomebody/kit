---
"@samthesomebody/kit": patch
"@samthesomebody/dock": patch
"@samthesomebody/panels": patch
---

Bug fixes from the kit / dock / panels review:

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
