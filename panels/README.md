# @samthesomebody/panels

Tool **panes** composed from [`@samthesomebody/kit`](../kit): a Console, a Hierarchy and an Inspector. Kit holds the building blocks (layout, controls, `Tree`, `Section`, `Property`, the type editors); a pane here composes them and owns the behaviour around them (filters, followed tails, folds remembered across reloads). **Kit does not depend on panels**, the same way it does not depend on [`dock`](../dock).

## Install

```bash
npm install @samthesomebody/panels @samthesomebody/kit
# peers: svelte ^5.28, @samthesomebody/kit
```

## Console

```svelte
<script>
  import Console, { ConsoleLog } from '@samthesomebody/panels/console.svelte';
  import ConsoleBar from '@samthesomebody/panels/consoleBar.svelte';
  import ConsoleLines from '@samthesomebody/panels/consoleLines.svelte';
  import ConsoleInput from '@samthesomebody/panels/consoleInput.svelte';

  const log = new ConsoleLog();
</script>

<Console entries={log.entries} onclear={() => log.clear()}>
  <ConsoleBar />
  <ConsoleLines />
  <ConsoleInput onsubmit={(text) => log.append({ level: 'log', text })} />
</Console>
```

Minimal is `Console` + `ConsoleLines`. Several consoles side by side share one `ConsoleView` (pass `view`) so one bar filters them all. Each pane's bar counts its own console's lines. `ConsoleDetail` shows the picked line in full; `ConsoleKey` is a latching key for the bar's `actions` snippet.

**A tool's own levels.** A line's `level` can be any string, not only the built-ins (`error`, `warn`, `info`, `log`, `debug`). Pass it to the bar to give it a key, and colour it from the tool's CSS through the `log-line <level>` and `log-level <level>` classes. A level the reader hasn't turned off shows from its first line.

```svelte
<ConsoleBar levels={['error', 'warn', 'success', 'info']} />
<ConsoleLines>
  {#snippet trailing(entry)}{#if entry.source === 'net'}<Badge text="net" />{/if}{/snippet}
</ConsoleLines>
```

`ConsoleLines`' `trailing` snippet draws the tool's own cells at the end of each line, before the repeat count and source.

## Hierarchy

```svelte
<Hierarchy {nodes} bind:selected persist="my-tool:scene" />
```

`nodes` are kit `TreeNode`s: `label`, plus `note`, `kind`, `badges` and `muted`. Hierarchy itself takes a `trailing` snippet (a cell at the end of every row), an `actions` snippet (keys after the filter), and `eye` with `bind:marked` for a visibility column. `persist` names the localStorage key the open branches are kept under; until something is saved, the top level starts open.

## Inspector

```svelte
<Inspector name={selected?.name} type={selected?.kind}>
  <Container size="fill">
    <InspectorSection id="transform" title="Transform">
      <Column recipe="fields">
        <Property label="X"><PropertyEditor property={{ type: 'number', unit: 'px' }} {value} onchange={set} /></Property>
      </Column>
    </InspectorSection>
  </Container>
</Inspector>
```

A tool adds a type by registering an editor on the kit's `editors` registry (`import { editors, defineEditor } from '@samthesomebody/kit/editors'`).

Folds are remembered per **fold store**. Give each tool its own, so two tools on one origin don't fold each other's sections:

```ts
import { createFoldStore } from '@samthesomebody/panels/inspectorSection.svelte';
export const folds = createFoldStore('my-tool:folds');
```

```svelte
<InspectorSection id="transform" title="Transform" store={folds}>…</InspectorSection>
```

Without `store`, sections share the default store (key `kit-inspector-folds`). A section with no `title` is the bare rule and doesn't fold.
