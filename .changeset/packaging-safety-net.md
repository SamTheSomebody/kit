---
"@samthesomebody/kit": patch
"@samthesomebody/dock": patch
"@samthesomebody/panels": patch
---

Packaging fixes:

- The `svelte` peer range is now `^5.28.0`. That is the oldest Svelte every component compiles on; some failed below 5.9, which `^5.0.0` allowed.
- dock and panels list `@samthesomebody/kit` as a peer dependency instead of a dependency, so an app always shares one copy of kit with them: one editor registry and one set of styles. Install kit beside them, as the READMEs already say.
- kit no longer publishes its tests, `components/tsconfig.json`, a stray private `components/package.json` or `cssAllow.json`.
