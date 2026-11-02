---
"@samthesomebody/dock": minor
---

Per-pane tab strip modes. A leaf's `strip` (`"always"` | `"never"`, absent = `"auto"`) overrides the root-solo and focus-mode rules, round-trips in the serialized layout, is validated by `parseLayout`, and is set from the pane menu (Layout › Tab strip). A strip-less pane keeps its tabs, close, float, split and collapse in the context menu, shows its ▸ stub when collapsed, and a float keeps its ⠿ grip on the window corner.
