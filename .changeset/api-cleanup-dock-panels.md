---
"@samthesomebody/dock": minor
"@samthesomebody/panels": minor
---

- **dock:** no longer ships `compareStage.css` or `timelineSheet.css`. They were one consumer's stylesheets (game-mono's editorUi), which now keeps its own copies.
- **dock:** `window.__DOCK__` is now opt-in. Set `ports.automation: true` (or `automation` on the Svelte `Dock`) to expose serialize, hydrate, state, openTab and closeTab for agent panes and scripted checks. It used to be installed for every dock, in production too, and the last dock made won.
- **panels, Console:**
  - lines can have a tool's own levels
  - `ConsoleView` keeps the levels turned off (`hidden`, `shows(level)`), so a new level shows from its first line; the `levels` option still sets which built-ins start shown
  - `ConsoleLines` takes a `trailing` snippet for the tool's own cells at the end of a line
- **panels, Inspector:**
  - `createFoldStore(key, { limit })` makes a fold store per tool, so two tools on one origin don't fold each other's sections, and stored ids are capped
  - `InspectorSection` takes a `store` and an optional `title`
  - `isFoldOpen`, `setFoldOpen` and `openFolds` keep working against the default store
- **panels:** imports the kit through its entry points, with no deep `.ts` paths. The README now matches the code.
