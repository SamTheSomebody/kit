# @samthesomebody/dock

Tool chrome **shell**: splits, tabs, floats.

Depends on [`@samthesomebody/kit`](https://www.npmjs.com/package/@samthesomebody/kit) (repo: [`../kit`](../kit)) for controls CSS/logic. **Kit does not depend on dock** — layout+controls work without a shell; shells (this package, forge rail, spine stages) sit above kit.

## Install

```bash
npm install @samthesomebody/dock @samthesomebody/kit
# peer: svelte ^5
```

## Use

```ts
import { createDock, DOCK_COMMANDS, DOCK_KEYMAP } from '@samthesomebody/dock';
import '@samthesomebody/dock/dock.css';
import '@samthesomebody/kit/tokens.css';
```

Svelte wrapper:

```svelte
<script>
  import Dock from '@samthesomebody/dock/dock.svelte';
</script>
```

## Layout persistence

Three-tier store (factory / default / current), shared by every dock tool:

```ts
import { createDockLayoutStore, dockLayoutJson, usableLayout } from '@samthesomebody/dock';
import type { DockLayoutStore, DockLayoutTabs } from '@samthesomebody/dock';
```

## Per-pane tab strip

Each leaf can override the dock's strip rules with `strip` in the serialized layout:

```json
{ "leaf": true, "id": "L2", "tabs": ["game", "assets"], "active": "game", "strip": "never" }
```

| `strip`          | Strip                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| absent / `auto`  | the dock decides: hidden for the root solo pane, or single-tab panes in focus mode |
| `always`         | always shown, even as the root solo pane or with focus mode on               |
| `never`          | always hidden: several tabs, collapsed, or floating                          |

`always` and `never` win over the global focus mode (`hideSingleTabBars`). `auto` is stored as
absence, and an unknown value is repaired to absence when the layout is parsed.

Right-click a pane, then **Layout › Tab strip** to set it. A pane with no strip keeps working
through the same menu: **Tabs** switches between its tabs, and Close, Float, Split and Collapse act on
its visible tab. Collapsed, it shows its ▸ stub. In a float, the ⠿ grip moves to the window's corner
and shows on hover. A pane dragged or floated whole keeps its mode.

## Layers

| Package                | Layer                              |
| ---------------------- | ---------------------------------- |
| `@samthesomebody/kit`  | layout + components + `./terminal` |
| `@samthesomebody/dock` | shell (optional)                   |

## Release

Versioned with the root repo via Changesets. See [../README.md](../README.md#release).

## License

MIT
