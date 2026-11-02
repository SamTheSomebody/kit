---
"@samthesomebody/kit": patch
---

Tree folding is easier to hit:

- **Double-click a branch row** to fold or unfold it. The whole line is the target, except the row's own controls (twisty, checkbox, eye). A double-click no longer selects the label's text.
- **The twisty's hit area covers the whole indent**, from the row's leading edge (the selection bar included) to the caret, at the full row height. Pressing anywhere left of the label folds the branch. It is an invisible pseudo-element, so nothing moves, and it applies to branches only: a leaf's indent still selects the row.
- The caret now turns inside the twisty (`.kit-tree-caret`) instead of the twisty turning, so the hit area doesn't rotate with it.
