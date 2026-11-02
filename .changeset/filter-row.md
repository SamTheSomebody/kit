---
"@samthesomebody/kit": minor
"@samthesomebody/panels": patch
---

**FilterRow** (kit, `@samthesomebody/kit/components/filterRow.svelte`): a list's filter drawn as the list's first row instead of a Field floating above it. It is a tree row tall and the pane's full width, with its search glyph on the twisty column and its count (`count`, e.g. `4/19`) on the type column, so typed text starts where the labels do. It goes straight in a `Pane`, above the `Container` the list scrolls in. Escape clears it, and a `trailing` snippet holds the list's own keys.

panels' **Hierarchy** uses it for its filter, which used to be a Field in its own padded container.
