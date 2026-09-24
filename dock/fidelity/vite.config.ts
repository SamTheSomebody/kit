/**
 * DEV-only fidelity harness (`docs/specs/2026-09-03-dock-kit-design.md`
 * §Fidelity-check plan). Nothing here is part of the published kit, so the
 * kit takes no `vite` dependency for it: the config is a plain object and
 * the binary is the workspace's own (`.claude/launch.json` → `dock-fidelity`).
 */
export default {
	root: import.meta.dirname,
	server: { port: 9843, strictPort: true },
};
