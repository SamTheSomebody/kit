/* The drawn answer to the native `title`.
 *
 * A tooltip is an ATTRIBUTE on a control, not a component to mount: content
 * is `data-tip` and the whole thing is one `::after`. That is why it can go
 * on anything — a key, a frameless icon, a table cell — without the caller
 * restructuring their markup around a wrapper, and why nothing has to
 * position it at runtime.
 *
 *   <button use:tooltip={"Re-run the last capture"}>…</button>
 *
 * `below` for a control near the top of its pane, where the default (above)
 * would land off-screen. `--tool-tip-delay` is the dwell, and focus skips it:
 * the delay is for a pointer crossing a control, nothing else.
 */

import "./tooltip.css";

export type TooltipOptions = string | { text: string; below?: boolean };

export const tooltip = (node: HTMLElement, options: TooltipOptions) => {
	const apply = (next: TooltipOptions): void => {
		const { text, below } = typeof next === "string" ? { text: next, below: false } : next;
		node.classList.add("kit-tip");
		node.classList.toggle("below", below === true);
		node.dataset.tip = text;
		/* the native tooltip is left in place as the accessible fallback —
		   `data-tip` is paint, `title` is what a screen reader announces */
		if (!node.hasAttribute("aria-label")) {
			node.title = text;
		}
	};
	apply(options);
	return {
		update: apply,
		destroy(): void {
			node.classList.remove("kit-tip", "below");
			delete node.dataset.tip;
		},
	};
};
