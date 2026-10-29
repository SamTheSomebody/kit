<script lang="ts">
	/* A prompt under the lines. Enter submits; ↑ and ↓ walk what was
	   submitted before, as a shell does; Escape empties the line. What a
	   submission does is the tool's: it usually appends to its `ConsoleLog`. */
	let {
		onsubmit,
		placeholder = "",
		prompt = "›",
	}: {
		onsubmit: (text: string) => void;
		placeholder?: string;
		prompt?: string;
	} = $props();

	let text = $state("");
	let history = $state<string[]>([]);
	/* Where ↑/↓ is in the history; `history.length` is the line being typed. */
	let cursor = $state(0);

	const submit = (event: SubmitEvent): void => {
		event.preventDefault();
		const line = text.trim();
		if (line === "") return;
		history = [...history.filter((past) => past !== line), line];
		cursor = history.length;
		text = "";
		onsubmit(line);
	};

	const walk = (event: KeyboardEvent): void => {
		if (event.key === "Escape") {
			text = "";
			cursor = history.length;
			return;
		}
		const step = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
		if (step === 0 || history.length === 0) return;
		event.preventDefault();
		cursor = Math.min(Math.max(cursor + step, 0), history.length);
		text = history[cursor] ?? "";
	};
</script>

<form class="log-input" onsubmit={submit}>
	<span class="log-prompt" aria-hidden="true">{prompt}</span>
	<input class="log-filter" aria-label="Console input" {placeholder} bind:value={text} onkeydown={walk} />
</form>
