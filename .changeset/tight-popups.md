---
"@samthesomebody/kit": patch
---

Popups sit above fields and are as tight as a row:

- **Tooltips draw on the menu layer** (`--dock-z-menu`) instead of `z-index: 1`. At 1, any later control with its own z-index, such as a select's value, painted over the bubble.
- **One tight spec for every floating surface**, set beside the surface variables in `controls.css`:
  - `--surface-pad-block`: 2px, the menu row's block padding
  - `--surface-pad-inline`: 5px
  - `--surface-line`: 1.2, the smallest line height that clears descenders when text wraps

  Tooltips, notifications and the confirm dialog use it. The dialog's padding and its gap between title, body and keys drop from 12px to 5px.
- The `use:tooltip` action loads `controls.css`, which holds the surface variables, so a page that uses only the action still gets a styled bubble.
