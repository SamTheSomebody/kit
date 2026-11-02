---
"@samthesomebody/kit": patch
---

A folding Section's header is now the toggle. The twisty sits first, left of the caption, where a tree's does, and a press anywhere on the header line (caption, rule or badge) folds or unfolds it. Controls in the `status` snippet keep their own clicks. The caption is a real button (`aria-expanded`), so the keyboard and screen readers reach the fold through it. The separate twisty key after the status is gone.
