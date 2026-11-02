---
"@samthesomebody/kit": minor
"@samthesomebody/panels": minor
---

Unity-style Inspector density. Kit adds `components/dense.css` (scoped under `.kit-dense`) and `setDense()` / `isDense()`. Inside a dense pane:
- one label column for the whole pane, with values aligned at every nesting depth;
- 18px rows with 2px gaps, the values keeping the kit's own look;
- a tinted component bar for each top-level section;
- labels that scrub number lines.

Property labels show their text as a tooltip when they have no tip. The panels Inspector is dense, with a tighter header.
