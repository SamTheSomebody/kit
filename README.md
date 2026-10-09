# @samthesomebody/kit

Tool chrome **layout** (pane structure recipes) + **controls** (Svelte components) + optional **terminal** panes (VT + structured log).

Optional shell: [`@samthesomebody/dock`](./dock) — splits/tabs/floats. Depends on this package; this package does **not** depend on dock. forge rail / spine stages are peer shells.

## Install

```bash
npm install @samthesomebody/kit
# peer: svelte ^5

# optional shell
npm install @samthesomebody/dock
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

### Section status badges

A section's status (a check, a measurement, a warning) goes in `Section`'s `status` snippet. It closes the title rule: `[caption] ——— [badges]`. Not in the section's control rows, not on a row of its own.

```svelte
<script>
  import Badge from '@samthesomebody/kit/components/badge.svelte';
  import Section from '@samthesomebody/kit/components/section.svelte';
</script>

<Section title="Grid">
  {#snippet status()}
    <Badge tone="ok" text="fits" />
    <Badge text="12 × 8" />
  {/snippet}
  <!-- control rows -->
</Section>
```

`status` needs a `title`; an untitled section is a bare rule and drops it.

## Terminal (optional)

VT + log panes. Subpath only — root kit index does **not** pull xterm or terminal CSS.

```ts
import { createTerminalPane, createLogPane } from '@samthesomebody/kit/terminal';
import '@samthesomebody/kit/tokens.css'; // --tool-* theme vars
```

CSS for the panes rides in with the `./terminal` import (`xterm.css` + `terminal.css`; log pane pulls `log.css`). Explicit CSS exports also exist: `@samthesomebody/kit/terminal/terminal.css`, `…/log.css`.

## Dock (optional)

```bash
npm install @samthesomebody/dock
```

See [`dock/README.md`](./dock/README.md). Layout persistence helpers (`createDockLayoutStore`, `dockLayoutJson`, `usableLayout`) ship on the dock package root.

## Agents

Intent → recipe: see game-mono `docs/skills/tool-chrome/SKILL.md` until mirrored here.

## License

MIT
