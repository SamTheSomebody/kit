# @samthesomebody/panels

Tool **panes** composed from [`@samthesomebody/kit`](../kit): a Console, a Hierarchy and an Inspector. Kit holds the building blocks (layout, controls, `Tree`, `Section`, `Property`, the type editors); a pane here composes them and owns the behaviour around them (filters, followed tails, folds remembered across reloads). **Kit does not depend on panels**, the same way it does not depend on [`dock`](../dock).

## Install

```bash
npm install @samthesomebody/panels @samthesomebody/kit
# peer: svelte ^5
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

Minimal is `Console` + `ConsoleLines`. Several consoles side by side share one `ConsoleView` (pass `view`) so one bar filters them all. `ConsoleDetail` shows the picked line in full; `ConsoleKey` is a latching key for the bar's `actions` snippet.

## Hierarchy

```svelte
<Hierarchy {nodes} bind:selected persist="my-tool:scene" />
```

`nodes` are kit `TreeNode`s: `label`, plus `note`, `kind`, `badges`, `muted` and a `trailing` snippet.

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

A tool adds a type by registering an editor on the kit's `editors` registry (`@samthesomebody/kit/components/editors.ts`).
