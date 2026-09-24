# @samthesomebody/kit

Tool chrome **layout** (pane structure recipes) + **controls** (Svelte components).

Dock / window chrome is **optional** and not shipped in `0.1.0` — shells stay per app (game-mono Dock, forge rail, spine stages).

## Install

```bash
npm install @samthesomebody/kit
# peer: svelte ^5
```

## Layout

```ts
import { createColumn, createColumns, createRow } from '@samthesomebody/kit';
import '@samthesomebody/kit/layout.css';
import '@samthesomebody/kit/tokens.css';
```

Svelte:

```svelte
<script>
  import Column from '@samthesomebody/kit/column.svelte';
  import Columns from '@samthesomebody/kit/columns.svelte';
  import LayoutRow from '@samthesomebody/kit/row.svelte';
</script>

<Column recipe="stack">
  <Columns>
    <Column recipe="fields">
      <LayoutRow>
        <span class="kit-label">Name</span>
        <!-- control -->
      </LayoutRow>
    </Column>
  </Columns>
  <LayoutRow recipe="toolbar"><!-- buttons --></LayoutRow>
</Column>
```

Recipes: `fields` | `toolbar` | `stack`. Gaps: `--dock-pad` only.

## Controls

```svelte
<script>
  import Button from '@samthesomebody/kit/components/button.svelte';
  import Field from '@samthesomebody/kit/components/field.svelte';
</script>
```

```ts
import '@samthesomebody/kit/components/index.css';
```

## Agents

Intent → recipe: see game-mono `docs/skills/tool-chrome/SKILL.md` until mirrored here.

## License

MIT
