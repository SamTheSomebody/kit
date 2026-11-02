---
"@samthesomebody/kit": patch
---

Tree eyes:

- **Solo with Alt/Option**, as Photoshop's eye works. Alt-click an eye (or press Alt+Space on its row) and only that entry stays on. Alt-click it again and what was on before comes back. Soloing another entry straight after keeps those same marks to return to, and any other edit ends the solo where it stands. The pure rule is `toggleSolo` (exported, with the `MarkSolo` type).
- **The type stays right-aligned when an eye follows it.** The eye and the type both took `margin-inline-start: auto` and split the free space between them, which pulled the type toward the middle of the row.
