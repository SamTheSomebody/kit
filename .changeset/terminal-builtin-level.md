---
"@samthesomebody/kit": patch
---

`@samthesomebody/kit/terminal` exports `BuiltInLogLevel` too, as `@samthesomebody/kit/terminal/core` already did. Code that maps the five built-in levels onto something closed, such as `console` methods, needs it now that `LogLevel` accepts a tool's own levels.
