<script lang="ts">
	import Button from "./button.svelte";

	import "./confirm.css";
	import "./controls.css";

	/* Floats over the work it is asking about, on the same squared surface
	   as the menu one step further out. Escape and the ground behind it both
	   cancel — a modal you can only leave by finding the right key is a trap
	   — and either key closes it, because this one ASKS rather than does.

	   Under 200px the two keys fill the body width instead of sitting at
	   their own: a dialog that narrow has no room for a right-aligned pair.
	   That is a container query, so it is the DIALOG's width that decides,
	   not the viewport's. */
	let {
		open = $bindable(false),
		title,
		body,
		confirmLabel = "Confirm",
		cancelLabel = "Cancel",
		tone = "default",
		onconfirm,
		oncancel,
	}: {
		open?: boolean;
		title: string;
		body?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		tone?: "default" | "primary" | "danger";
		onconfirm?: () => void;
		oncancel?: () => void;
	} = $props();

	const close = (): void => {
		open = false;
		oncancel?.();
	};
</script>

<svelte:window onkeydown={(event) => open && event.key === "Escape" && close()} />

{#if open}
	<!-- the ground behind it cancels; the dialog itself does not -->
	<div
		class="kit-dialog-ground"
		role="presentation"
		onclick={(event) => event.target === event.currentTarget && close()}
	>
		<div class="kit-dialog" role="dialog" aria-modal="true" aria-label={title}>
			<h3>{title}</h3>
			{#if body}<p>{body}</p>{/if}
			<div class="kit-bar">
				<Button label={cancelLabel} onclick={close} />
				<Button
					label={confirmLabel}
					{tone}
					onclick={() => {
						open = false;
						onconfirm?.();
					}}
				/>
			</div>
		</div>
	</div>
{/if}
