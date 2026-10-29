<script lang="ts">
	/* A console bar's latching key: the level keys, Collapse, and any toggle
	   a tool adds to the bar (an error pause). A level that is off is struck
	   through, so it never reads as a quiet one; a toggle (no `level`) that
	   is off is just muted, and on takes the accent rule. */
	let {
		label,
		pressed,
		level,
		quiet = false,
		tip,
		onclick,
	}: {
		label: string;
		pressed: boolean;
		/** Colours the key as its level while it is on: `error` or `warn`. */
		level?: string;
		/** Nothing behind it: drawn faint. */
		quiet?: boolean;
		tip?: string;
		onclick: () => void;
	} = $props();
</script>

<button type="button" class="log-level {level ?? ''}" class:toggle={level === undefined} class:quiet aria-pressed={pressed} title={tip} {onclick}
	>{label}</button
>
