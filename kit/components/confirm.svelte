<script lang="ts">
	import { tick } from "svelte";

	import Button from "./button.svelte";

	import "./controls.css";
	import "./confirm.css";

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

	/* MODAL MEANS FOCUS TOO. Opening moves focus to the cancel key, the
	   answer that does nothing, so a stray Enter can't confirm a delete;
	   Tab stays inside the dialog; closing gives focus back to whatever had
	   it, usually the key that opened the dialog. */
	let dialog = $state<HTMLElement>();
	$effect(() => {
		if (!open) return;
		const before = document.activeElement;
		void tick().then(() => dialog?.querySelector<HTMLElement>("button")?.focus());
		return () => {
			if (before instanceof HTMLElement && before.isConnected) before.focus();
		};
	});

	const keepFocus = (event: KeyboardEvent): void => {
		if (event.key !== "Tab" || !dialog) return;
		const keys = [...dialog.querySelectorAll<HTMLElement>("button:not([disabled])")];
		const first = keys[0];
		const last = keys[keys.length - 1];
		if (!first || !last) return;
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
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
		<div
			class="kit-dialog"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
			bind:this={dialog}
			onkeydown={keepFocus}
		>
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
