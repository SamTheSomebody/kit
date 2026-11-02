---
"@samthesomebody/kit": minor
---

Deep `.ts` paths are no longer exported: `@samthesomebody/kit/components/*.ts` and `@samthesomebody/kit/terminal/*.ts` are gone, as announced in 0.4. Use the entry points instead:

- `@samthesomebody/kit/components`: control logic, `createRegistry`, the editor and property types, and the notification queue (`pushNotification` and friends, newly exported here)
- `@samthesomebody/kit/editors`
- `@samthesomebody/kit/tooltip`
- `@samthesomebody/kit/terminal/core`
- `@samthesomebody/kit/terminal`

Components (`*.svelte`) and stylesheets (`*.css`) keep their paths.
