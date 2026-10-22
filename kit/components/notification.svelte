<script lang="ts">
	/**
	 * Notification — the surface for `DockEventsPort.notify`.
	 *
	 * The dock kit reports what it did ("tab moved", "pane merged", "one pane
	 * always stays open") and deliberately renders nothing for it, so that the
	 * core stays framework-agnostic and chrome-free. This is the Svelte answer
	 * to that seam, and with the tool header dissolving into dock tabs it is
	 * where a tool's transient messages and errors land
	 * ( phase 3).
	 *
	 * Wire it by instance, so ordering never matters:
	 *
	 *     <Notification bind:this={notification} />
	 *     <Dock {tabs} on={{ notify: (text) => notification?.notify(text) }} />
	 *
	 * Consumers call `notify(text, "error")` for their own failures — the
	 * dock's own messages are confirmations and clear themselves, an error
	 * stays until it is dismissed. The queue's rules live in
	 * `notification.ts`, unit-tested away from the DOM.
	 */
	import {
		expireNotifications,
		nextNotificationDeadline,
		pushNotification,
		type NotificationEntry,
		type NotificationSeverity,
	} from "./notification.ts";

	import "./notification.css";

	let {
		lifetimeMilliseconds,
		maximum,
	}: {
		/** Override how long a confirmation stays. Errors never expire. */
		lifetimeMilliseconds?: number;
		/** Override how many entries the corner holds. */
		maximum?: number;
	} = $props();

	let entries = $state<NotificationEntry[]>([]);
	let sequence = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;

	/* One timer for the whole queue, armed at the soonest deadline. Its job is
	   only to wake us up: what actually clears is decided by comparing
	   deadlines against the clock, because agent browser panes and hidden tabs
	   throttle chained timeouts to roughly one a minute — a late tick must
	   clear everything that went stale while we were not running, not one
	   entry per tick. */
	const arm = (): void => {
		clearTimeout(timer);
		timer = undefined;
		const deadline = nextNotificationDeadline(entries);
		if (deadline === null) {
			return;
		}
		timer = setTimeout(
			() => {
				entries = expireNotifications(entries, Date.now());
				arm();
			},
			Math.max(0, deadline - Date.now()),
		);
	};

	export const notify = (text: string, severity: NotificationSeverity = "info"): void => {
		sequence += 1;
		const now = Date.now();
		/* clear the stale before appending, so a burst after a throttled gap
		   does not read as history */
		entries = pushNotification(expireNotifications(entries, now), {
			text,
			severity,
			now,
			id: sequence,
			lifetimeMilliseconds,
			maximum,
		});
		arm();
	};

	export const dismiss = (id: number): void => {
		entries = entries.filter((entry) => entry.id !== id);
		arm();
	};

	export const clear = (): void => {
		entries = [];
		arm();
	};

	$effect(() => () => clearTimeout(timer));
</script>

<div class="kit-notes" role="status" aria-live="polite">
	{#each entries as entry (entry.id)}
		<!-- The whole note is the target. A transient thing you are trying to
		     read should not also ask you to hit a 12px glyph in its corner —
		     and the status light IS where the × goes, in the cell the eye is
		     already on, so nothing shifts and no gutter is held open for
		     something usually absent. -->
		<button type="button" class="kit-note" data-dev="notification" title="Dismiss" onclick={() => dismiss(entry.id)}>
			<span class="dock-tab-dot" data-status={entry.severity === "error" ? "danger" : "ok"}></span>
			<span class="kit-note-close" aria-hidden="true">×</span>
			<span class="kit-note-text">{entry.text}</span>
			{#if entry.count > 1}
				<span class="kit-note-count" aria-label="{entry.count} times">×{entry.count}</span>
			{/if}
			<!-- The timer is the bottom EDGE, in the tone's colour, draining
			     right to left. Bottom because that is where this kit puts a
			     state: the tab's underline, the key's hard edge, a field's
			     rule. An entry with no deadline (an error) has nothing to
			     drain, so it carries the edge without the animation. -->
			<span
				class="kit-note-timer"
				style={entry.expiresAt === null ? "animation: none" : `animation-duration: ${entry.dwell}ms`}
			></span>
		</button>
	{/each}
</div>
