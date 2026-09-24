/* The drawn half of the icon set: a hidden sprite sheet, injected once per
 * document by `icon.svelte`. 12×12 grid, `currentColor`, hairline stroke —
 * an icon is never a second palette. The three gestures are 8×12 so each
 * fills exactly one monospace cell in a hint column.
 *
 * Verbatim from the signed artifact down to `i-restore`; `fidelity/` hashes
 * those against it.
 *
 * THE LAST SEVEN ARE THE ESTATE'S OWN, added 2026-09-06 for the editor bar:
 * four transforms and three transport keys — `restart` is the fourth and it
 * reuses `i-refresh`, because restarting a game is a RELOAD. It had its own
 * `i-restart` (a rewind bar and triangle) for a day, and a transport rewind
 * is what a reader took it for: "back to the start of what?" The drawing is
 * gone rather than left unused — every byte of this sheet ships in a game. That toolbar shipped in worded
 * keys and wrapped onto two lines in the DEV shell's pane, and the kit had no
 * drawing for any of them. `i-rotate` is `i-refresh` plus the pivot it turns
 * about — the arc alone already means "reload". They are NOT in the artifact,
 * so the gallery's icon row diverges from `reference.html` until it is
 * republished; nothing else in the fidelity walk touches them.
 *
 * The sheet is a shipped string — every byte of it lands in a game's bundle —
 * so the reasoning lives up here and never between the symbols. */

export const ICON_SPRITE = `
	<symbol id="i-refresh" viewBox="0 0 12 12"><path d="M10.1 6.4A4.2 4.2 0 1 1 8.6 3"/><path d="M10.7 1.2v2.7H8"/></symbol>
	<symbol id="i-generate" viewBox="0 0 12 12"><path d="M6 1.8 7.1 4.9 10.2 6 7.1 7.1 6 10.2 4.9 7.1 1.8 6 4.9 4.9Z" fill="currentColor" stroke="none"/></symbol>
	<symbol id="i-search" viewBox="0 0 12 12"><circle cx="5" cy="5" r="3.2"/><path d="M7.5 7.5 10.6 10.6"/></symbol>
	<symbol id="i-download" viewBox="0 0 12 12"><path d="M6 1.3v6.2"/><path d="M3.4 5.1 6 7.7l2.6-2.6"/><path d="M1.6 10.4h8.8"/></symbol>
	<symbol id="i-copy" viewBox="0 0 12 12"><path d="M1.4 1.4h6.2v6.2H1.4z"/><path d="M4.4 10.6h6.2V4.4"/></symbol>
	<symbol id="i-trash" viewBox="0 0 12 12"><path d="M2.2 3.3h7.6"/><path d="M4.6 3.3V1.9h2.8v1.4"/><path d="m3.3 3.3.5 7.1h4.4l.5-7.1"/></symbol>
	<symbol id="i-filter" viewBox="0 0 12 12"><path d="M1.4 2.2h9.2L7.1 6.5v3.9L4.9 9.2V6.5z"/></symbol>
	<symbol id="i-sliders" viewBox="0 0 12 12"><path d="M1.2 3.6h9.6M1.2 8.4h9.6"/><circle cx="4.2" cy="3.6" r="1.4"/><circle cx="8" cy="8.4" r="1.4"/></symbol>
	<symbol id="i-mouse-left" viewBox="0 0 8 12"><path d="M4 .6A3.4 3.4 0 0 0 .6 4v.8H4z" fill="currentColor" stroke="none"/><rect x=".6" y=".6" width="6.8" height="10.8" rx="3.4"/><path d="M.6 4.8h6.8M4 .6v4.2"/></symbol>
	<symbol id="i-mouse-right" viewBox="0 0 8 12"><path d="M4 .6A3.4 3.4 0 0 1 7.4 4v.8H4z" fill="currentColor" stroke="none"/><rect x=".6" y=".6" width="6.8" height="10.8" rx="3.4"/><path d="M.6 4.8h6.8M4 .6v4.2"/></symbol>
	<symbol id="i-mouse-middle" viewBox="0 0 8 12"><rect x="3.4" y="1.5" width="1.2" height="2.6" rx=".6" fill="currentColor" stroke="none"/><rect x=".6" y=".6" width="6.8" height="10.8" rx="3.4"/><path d="M.6 4.8h6.8"/></symbol>
	<symbol id="i-grip" viewBox="0 0 12 12"><g fill="currentColor" stroke="none"><circle cx="4.4" cy="2.6" r=".85"/><circle cx="7.6" cy="2.6" r=".85"/><circle cx="4.4" cy="6" r=".85"/><circle cx="7.6" cy="6" r=".85"/><circle cx="4.4" cy="9.4" r=".85"/><circle cx="7.6" cy="9.4" r=".85"/></g></symbol>
	<symbol id="i-pin" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4"/></symbol>
	<symbol id="i-pin-on" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4"/><circle cx="6" cy="6" r="1.5" fill="currentColor" stroke="none"/></symbol>
	<symbol id="i-lock-open" viewBox="0 0 12 12"><path d="M2.4 5.6h7.2v5.2H2.4z"/><path d="M4.3 5.6V3.8a1.7 1.7 0 0 1 3.4 0"/></symbol>
	<symbol id="i-lock-closed" viewBox="0 0 12 12"><path d="M2.4 5.6h7.2v5.2H2.4z"/><path d="M4.3 5.6V3.8a1.7 1.7 0 0 1 3.4 0v1.8"/></symbol>
	<symbol id="i-eye" viewBox="0 0 12 12"><path d="M1 6s2-3.2 5-3.2S11 6 11 6s-2 3.2-5 3.2S1 6 1 6Z"/><circle cx="6" cy="6" r="1.3"/></symbol>
	<symbol id="i-eye-off" viewBox="0 0 12 12"><path d="M1 6s2-3.2 5-3.2S11 6 11 6s-2 3.2-5 3.2S1 6 1 6Z"/><circle cx="6" cy="6" r="1.3"/><path d="M1.8 10.2 10.2 1.8"/></symbol>
	<symbol id="i-star" viewBox="0 0 12 12"><path d="m6 1.3 1.45 2.94 3.25.47-2.35 2.29.55 3.23L6 8.71 3.1 10.23l.55-3.23L1.3 4.71l3.25-.47z"/></symbol>
	<symbol id="i-star-on" viewBox="0 0 12 12"><path d="m6 1.3 1.45 2.94 3.25.47-2.35 2.29.55 3.23L6 8.71 3.1 10.23l.55-3.23L1.3 4.71l3.25-.47z" fill="currentColor"/></symbol>
	<symbol id="i-link" viewBox="0 0 12 12"><path d="M4.6 7.4 7.4 4.6"/><path d="M6.9 3.6 8 2.5a2.1 2.1 0 0 1 3 3L9.9 6.6"/><path d="M5.1 8.4 4 9.5a2.1 2.1 0 0 1-3-3L2.1 5.4"/></symbol>
	<symbol id="i-link-off" viewBox="0 0 12 12"><path d="M6.9 3.6 8 2.5a2.1 2.1 0 0 1 3 3L9.9 6.6"/><path d="M5.1 8.4 4 9.5a2.1 2.1 0 0 1-3-3L2.1 5.4"/></symbol>
	<symbol id="i-expand" viewBox="0 0 12 12"><path d="M4.6 1.4H1.4v3.2M7.4 10.6h3.2V7.4"/></symbol>
	<symbol id="i-restore" viewBox="0 0 12 12"><path d="M1.4 4.6h3.2V1.4M10.6 7.4H7.4v3.2"/></symbol>

	<symbol id="i-move" viewBox="0 0 12 12"><path d="M6 1.3v9.4M1.3 6h9.4"/><path d="M4.4 3 6 1.3 7.6 3M4.4 9 6 10.7 7.6 9M3 4.4 1.3 6 3 7.6M9 4.4 10.7 6 9 7.6"/></symbol>
	<symbol id="i-rotate" viewBox="0 0 12 12"><path d="M10.1 6.4A4.2 4.2 0 1 1 8.6 3"/><path d="M10.7 1.2v2.7H8"/><circle cx="6" cy="6" r="1" fill="currentColor" stroke="none"/></symbol>
	<symbol id="i-scale" viewBox="0 0 12 12"><path d="M1.4 4.6v6h6"/><path d="M4.6 7.4 10.6 1.4"/><path d="M7.4 1.4h3.2v3.2"/></symbol>
	<symbol id="i-anchor" viewBox="0 0 12 12"><circle cx="6" cy="6" r="2.4"/><path d="M6 .9v2.7M6 8.4v2.7M.9 6h2.7M8.4 6h2.7"/></symbol>
	<symbol id="i-play" viewBox="0 0 12 12"><path d="M3.4 1.9 10 6l-6.6 4.1z" fill="currentColor" stroke="none"/></symbol>
	<symbol id="i-pause" viewBox="0 0 12 12"><g fill="currentColor" stroke="none"><rect x="3" y="2.2" width="2" height="7.6"/><rect x="7" y="2.2" width="2" height="7.6"/></g></symbol>
	<symbol id="i-step" viewBox="0 0 12 12"><g fill="currentColor" stroke="none"><path d="M2.2 2.2 7.6 6l-5.4 3.8z"/><rect x="8.4" y="2.2" width="1.6" height="7.6"/></g></symbol>
`;
