<script lang="ts">
	import { type IconName, bindToggle, isToggle } from "./index.ts";

	import Icon from "./icon.svelte";

	import "./icon.css";
	import "./tooltip.css";

	/* The frameless icon: no plate, no border, colour is the whole state
	   machine. It is the button for anything that lives INSIDE another
	   control — a field's action, a tab's close, a tree row's eye — because
	   a plate inside a plate reads as two controls. */
	let {
		name,
		label,
		tone = "default",
		pressed,
		labelOn,
		expanded,
		disabled = false,
		tip = true,
		class: extra = "",
		onclick,
		ontoggle,
		onpointerdown,
	}: {
		name: IconName;
		/* the accessible name, and the tooltip; a frameless icon has no text */
		label: string;
		tone?: "default" | "danger";
		/* a toggling icon: `aria-pressed` picks the drawn form */
		pressed?: boolean;
		/* what it is called once it is pressed — "Unpin" for "Pin" */
		labelOn?: string;
		/* a twisty rotates rather than swapping character (the dock's rule) */
		expanded?: boolean;
		disabled?: boolean;
		tip?: boolean;
		class?: string;
		onclick?: (event: MouseEvent) => void;
		/* What makes this a TOGGLE rather than a button drawn like one: the
		   press, every icon a swipe crosses on the way past and the keyboard's
		   Enter all arrive here, because `ontoggle` is what binds the kit's
		   toggle gesture (`controls/paint.ts`). Use it in place of `onclick`
		   for anything with a `pressed` state — an `onclick` toggle is the
		   one that cannot be swiped. */
		ontoggle?: (on: boolean) => void;
		/* a gesture that is not this control's own — the tree's reorder grip
		   starts a drag from pointerdown */
		onpointerdown?: (event: PointerEvent) => void;
	} = $props();

	const words = $derived(pressed === true && labelOn ? labelOn : label);
	const toggling = $derived(isToggle(name) || pressed !== undefined);

	/* An action, not an `$effect`: the listeners are bound once to the element
	   and die with it, where an effect would re-bind on every prop read it
	   happened to track. `pressed` is read INSIDE the accessor so the gesture
	   always sees the current state rather than the one at mount. */
	const gesture = (node: HTMLButtonElement): void => {
		if (!ontoggle) {
			return;
		}
		bindToggle(node, { pressed: () => pressed === true, write: (on) => ontoggle?.(on) });
	};
</script>

<button
	type="button"
	class="kit-icon {tip ? 'kit-tip below' : ''} {extra}"
	data-tone={tone === "default" ? undefined : tone}
	data-icon={toggling ? "" : undefined}
	data-tip={tip ? words : undefined}
	aria-pressed={pressed}
	aria-expanded={expanded}
	aria-label={words}
	title={words}
	{disabled}
	{onclick}
	{onpointerdown}
	use:gesture
>
	<Icon {name} on={pressed === true} />
</button>
