---
"@samthesomebody/kit": minor
---

Curated entry points, tool-defined log levels and a stricter kit-check:

- **New entry points.** Logic is no longer reached through deep `.ts` files:
  - `@samthesomebody/kit/editors`: the type-editor registry (`editors`, `defineEditor`) and its types
  - `@samthesomebody/kit/tooltip`: the `tooltip` action
  - `@samthesomebody/kit/terminal/core`: the log model, link matcher and port types, without xterm
  - `@samthesomebody/kit/components` now also exports `createRegistry` and `Registry`, plus the editor and property types (type-only, so the index stays free of Svelte and CSS)

  Deep `.ts` paths such as `@samthesomebody/kit/components/editors.ts` still resolve in 0.4 but are deprecated and go away in 0.5.
- **Log levels:**
  - `LogLevel` accepts a tool's own levels (any string), and the built-ins are now `BuiltInLogLevel`
  - `countByLevel` counts every level it sees
  - a tool's level is coloured from its CSS through the `log-line <level>` and `log-level <level>` classes
- **Status dot.** It is `.kit-status-dot`; `.dock-tab-dot` stays as an alias.
- **kit-check:**
  - named colours (in properties that take a colour) and the `font` shorthand are findings, and `uppercase` matches in any case
  - `--update` refuses to grow the baseline without `--force`
  - an exclude path with a trailing slash works
  - a malformed `package.json` or baseline stops the check instead of being treated as missing
  - unknown options are errors, and there is a `--help`
  
  The stricter rules can find things a baseline didn't hold; lock them in deliberately with `kit-check --update --force`, or fix them.
