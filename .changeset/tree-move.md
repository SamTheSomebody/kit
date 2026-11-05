---
"@samthesomebody/kit": minor
"@samthesomebody/panels": minor
---

Tree `move`: Unity-style Hierarchy drag. A row dragged past a few pixels moves before or after another row, or into it (a new last child), across parents; the owner applies `onmove({ id, target, position })` (`canMove`, `nests` to refuse). New helpers `moveZone`, `canMoveTo` and the `MovePosition` type. The panels' Hierarchy passes `move`, `canMove`, `nests` and `onmove` through.
