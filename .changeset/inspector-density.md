---
"@samthesomebody/kit": minor
"@samthesomebody/panels": minor
---

Unity-style Inspector density. Kit adds `components/dense.css` (scoped under `.kit-dense`) and `setDense()` / `isDense()`. Inside a dense pane:
- one label column for the whole pane, with values aligned at every nesting depth;
- 18px boxed values with 2px gaps;
- a tinted component bar for each top-level section;
- booleans as checkboxes, and labels that scrub number lines.

Property labels show their text as a tooltip when they have no tip. The panels Inspector is dense, with a tighter header.
