# @samthesomebody/dock

Tool chrome **shell**: splits, tabs, floats.

Depends on [`@samthesomebody/kit`](https://www.npmjs.com/package/@samthesomebody/kit) for controls CSS/logic. **Kit does not depend on dock** — layout+controls work without a shell; shells (this package, forge rail, spine stages) sit above kit.

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

## Layers

| Package | Layer |
| ------- | ----- |
| `@samthesomebody/kit` | layout + components |
| `@samthesomebody/dock` | shell (optional) |

## License

MIT
