/* The terminal's model without its view: the log lines (`log.ts`), the link
 * matcher (`links.ts`) and the port types. Nothing here imports xterm, so a
 * Svelte console (panels) or a plain-DOM log reads the same model without
 * loading a terminal emulator. `@samthesomebody/kit/terminal` is the whole
 * thing, VT pane included. */
export * from "./log.ts";
export { describeTerminalLink, matchTerminalLinks } from "./links.ts";
export type { TerminalLinkMatch } from "./links.ts";
export type * from "./types.ts";
