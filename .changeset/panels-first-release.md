---
"@samthesomebody/panels": minor
---

First release: tool panes composed from `@samthesomebody/kit`, which does not depend on this package.

- `Console`, composed from `ConsoleBar`, `ConsoleLines`, `ConsoleInput`, `ConsoleDetail` and `ConsoleKey`, on the kit log pane's model and sheet so it reads like `createLogPane`. `ConsoleLog` is a buffer to append to; a shared `ConsoleView` filters several consoles at once.
- `Hierarchy`: a filter (matching label, kind and note, keeping ancestors, with a count) over a kit `Tree` that opens the branches above a selection and remembers open branches per `persist` key.
- `Inspector` (name with the muted type, over its body) and `InspectorSection` (a kit `Section` whose fold is remembered by id; `isFoldOpen`, `setFoldOpen`, `openFolds`).
