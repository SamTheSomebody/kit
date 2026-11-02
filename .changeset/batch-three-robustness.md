---
"@samthesomebody/kit": patch
"@samthesomebody/panels": patch
---

Robustness fixes from the kit / dock / panels review:

- **Every control loads the CSS it draws with.** Each component imports `controls.css` (the shared layer: surface variables, status dot, drag cursors, scrollbars), plus `layout.css` for Pane and Row and `tooltip.css` for Property. A control imported on its own, without `components/index.css`, now renders fully. Before, a menu had no background or border. A new test checks each component against its imports. panels' Console loads `controls.css` too.
- **Field keeps the model's type.** Typing writes back the shape that was passed in: a number model takes only finite numbers, and a string model stays a string. Clearing a number field no longer writes `null`, and half-typed text such as "1.50" isn't rewritten under the caret. On blur the field shows the value again.
- **Kit editors follow the property's value.** The number, string, vector and colour editors bind their fields to a draft that tracks the value, so a value the tool clamped or refused doesn't stay on screen after the field is left.
- **Slider picks up new bounds.** It re-seeds when the `min`, `max`, limits or `elastic` passed to it change (an inspector reusing the slider for another object), while a re-render with the same props still leaves a grown elastic track alone. `reseedSlider` and `sameSliderBounds` are exported.
- **Drags always end.**
  - Scrub ends on lost pointer capture, and unbinding mid-drag (a field unmounted or disabled) clears `body.scrubbing`.
  - Tree reorder, Scroll's rail and DualSlider also end on `pointercancel` and window blur. Tree clears `body.reordering` if it unmounts mid-drag.
  - DualSlider no longer divides by zero when `min === max`.
- **Scroll** re-measures when its content or size changes (it only did on scroll), and uses `$props.id()` instead of a random id.
- **Keyboard:**
  - Tree and Table put the first row in the tab order while nothing is selected.
  - Tree arrow keys move focus with the selection.
  - Table no longer selects disabled rows.
  - Confirm focuses its cancel key on open, keeps Tab inside, and gives focus back on close.
  - Segment is a `group` of toggle keys. It was a `radiogroup` with no radio children.
