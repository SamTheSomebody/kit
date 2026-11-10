---
"@samthesomebody/kit": minor
"@samthesomebody/panels": minor
---

`ObjectField`: Unity-style object slot. It holds one item of a domain by id and draws it as a pill (click it to `onreveal`; × or Delete clears it when `allowEmpty`). The search icon opens a picker with fuzzy search, recent picks per `kind`, items grouped by `folder`, arrow keys and Enter. It also takes a drop of a row dragged out of a tree (`kind`, or several kinds with `accepts`), and lights up while such a drag is in flight. New `carry.ts` protocol (`startCarry`, `bindCarryTarget`, `Carried`) built on document events, so a drag can cross realms. Tree `carry`: a row with a payload is carried once the pointer leaves the tree (a drag inside it still moves, with `move` on). The panels' Hierarchy passes `carry` through. New rules: `fuzzyScore`, `pickerRows`, `withRecent` and `slotAccepts`.
