/**
 * terminal — the console kit
 * (`docs/specs/2026-09-04-terminal-kit-design.md`). A real VT in a pane:
 * colour and text attributes, cursor addressing, scrollback, selection,
 * find, clickable URLs and file paths, and key binds that reach the process
 * behind it.
 *
 * Framework-agnostic TypeScript + DOM, for the same reason the `dock` kit is
 * (spec §Packaging): the pane mounts through `DockTabDef.render(element)`,
 * and the DEV game shell has no Svelte at all. Import from
 * `@samthesomebody/kit/terminal`. Load `@samthesomebody/kit/tokens.css` (or
 * host `--tool-*` tokens) so theme vars resolve.
 */

import '@xterm/xterm/css/xterm.css';
import './terminal.css';

export { createTerminalPane } from './pane.ts';
/* The kit's SECOND pane. `createTerminalPane` is a VT — bytes from a process
   in a cell grid; `createLogPane` is a mirror of another document's `console`
   — structured entries that wrap, filter by level and collapse repeats. Both
   are consoles and neither is the other (`log.ts` §What "closer to the chrome
   console" cost). */
export { createLogPane } from './logPane.ts';
export type { LogPaneHandle, LogPanePorts } from './logPane.ts';
export { appendEntry, clockText, countByLevel, filterEntries, isPinnedToBottom, LOG_LEVELS, logText, matchesFilter } from './log.ts';
export type { LogEntry, LogFilter, LogInput, LogLevel } from './log.ts';
export { describeTerminalLink, matchTerminalLinks } from './links.ts';
export type { TerminalLinkMatch } from './links.ts';
export { resolveTerminalKey, terminalKeyLegend } from './keys.ts';
export { TERMINAL_SEARCH, TERMINAL_THEME, terminalMetricsOf, terminalSearchThemeOf, terminalThemeOf } from './theme.ts';
export type { TerminalMetrics } from './theme.ts';
export type { TerminalAction, TerminalEventsPort, TerminalKeyContext, TerminalKeyEvent, TerminalLinksPort, TerminalLinkTarget, TerminalPaneHandle, TerminalPorts, TerminalSessionPort, TerminalSignal } from './types.ts';
