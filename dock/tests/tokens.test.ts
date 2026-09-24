import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { DOCK_THEME } from '../index.ts';
import { describe, expect, it } from 'vitest';

const tokens = readFileSync(join(import.meta.dirname, '..', '..', 'tokens.css'), 'utf8');

const declared = (name: string): string => {
  const match = tokens.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!match?.[1]) {
    throw new Error(`${name} is not declared in tokens.css`);
  }
  return match[1].trim();
};

/* The controls spend ten of the dock's knobs. `applyDockTheme` writes them
   onto a `.dock-stage`, so a tool that has not mounted a dock has none of
   them — and `box-shadow: 0 var(--dock-tab-underline) 0` with the variable
   unset is an INVALID declaration the browser drops without a word. That is
   how it presented: keys with no hard edge and fields with no rule, no
   console error, in a gallery that had every other token.

   The root defaults in tokens.css fix it and duplicate DOCK_THEME to do so.
   This is the freeze that stops the two drifting, in the same shape as
   palette.json's. */
describe('the dock knobs the controls spend', () => {
  const shared: [string, string][] = [
    ['--dock-divider', `${DOCK_THEME.divider}px`],
    ['--dock-pad', `${DOCK_THEME.pad}px`],
    ['--dock-pad-tight', `${DOCK_THEME.padTight}px`],
    ['--dock-tab-underline', `${DOCK_THEME.tabUnderline}px`],
    ['--dock-tab-tracking', String(DOCK_THEME.tabTracking)],
    ['--dock-drag-opacity', String(DOCK_THEME.dragOpacity)],
    ['--dock-menu-min-w', `${DOCK_THEME.menuMinWidth}px`],
    ['--dock-z-menu', String(DOCK_THEME.zMenu)],
    ['--dock-tab-dot', `${DOCK_THEME.tabDot}px`],
    ['--dock-tab-dot-pulse', `${DOCK_THEME.tabDotPulseMs}ms`],
  ];

  it.each(shared)('%s matches DOCK_THEME', (name, expected) => {
    expect(declared(name)).toBe(expected);
  });

  /* If the kit starts spending an eleventh, it needs a default here too or it
	   silently loses that rule outside a dock. */
  it("covers every --dock-* the kit's own CSS reads", () => {
    const directory = join(import.meta.dirname, '..', '..', 'components');
    const read = readdirSync(directory)
      .filter(name => name.endsWith('.css') || name.endsWith('.svelte'))
      .flatMap(name => [...readFileSync(join(directory, name), 'utf8').matchAll(/--dock-[a-z-]+/g)])
      .map(([variable]) => variable);
    const covered = new Set(shared.map(([name]) => name));
    expect([...new Set(read)].filter(variable => !covered.has(variable))).toEqual([]);
  });
});
