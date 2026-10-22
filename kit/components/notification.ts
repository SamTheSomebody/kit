/**
 * Notification queue logic — the pure half of `notification.svelte`, in the
 * same shape `overlay.ts` takes to `Layout.svelte`: no runes, no DOM, so the
 * awkward parts are unit-testable.
 *
 * The surface is fed by `DockEventsPort.notify` ("tab moved", "pane merged",
 * "one pane always stays open"), so the same text arrives repeatedly and in
 * bursts — collapsing consecutive duplicates into a count is the difference
 * between a readable corner and a wall.
 */

export type NotificationSeverity = "info" | "error";

export type NotificationEntry = {
	id: number;
	text: string;
	severity: NotificationSeverity;
	/** Consecutive repeats collapsed into this one. */
	count: number;
	/** Epoch ms when this should clear; `null` never expires. */
	expiresAt: number | null;
	/** How long that deadline was set for. The drawn timer drains over
	 *  exactly this, so a note that arrives late does not inherit the age of
	 *  the stack it lands in. */
	dwell: number;
};

/** How long a note stays.
 *
 * EVERYTHING EXPIRES, ERRORS INCLUDED, since 2026-09-05 ([HUMAN] Sam,
 * aligning to the control-kit artifact). Errors used to be permanent so a
 * "Save failed (500)" could not vanish while the reader was elsewhere; the
 * artifact answers that better than immortality did. The bottom-edge timer
 * SHOWS the time remaining, hovering any note pauses EVERY note's timer, and
 * a press dismisses — so a note you are reading cannot leave under you, and
 * one you have read goes without hunting for a 12px ×.
 *
 * An error is given the longer dwell rather than a different rule: 3× the
 * confirmation, because it carries a sentence rather than two words. A
 * consumer with something that genuinely must not leave passes
 * `lifetimeMilliseconds: Infinity` — the queue treats a non-finite deadline
 * as no deadline, which is the one honest way to say "never" now that it is
 * not a severity's birthright. */
export const NOTIFICATION_LIFETIME_MILLISECONDS = 4000;
export const NOTIFICATION_ERROR_LIFETIME_MILLISECONDS = 12000;
export const NOTIFICATION_MAXIMUM = 4;

export type PushOptions = {
	text: string;
	severity?: NotificationSeverity;
	now: number;
	id: number;
	lifetimeMilliseconds?: number;
	maximum?: number;
};

/**
 * Append `text`, or collapse it into the newest entry when that entry says
 * the same thing at the same severity — which also refreshes its expiry, so a
 * burst of "tab moved" reads as one line that stays for one lifetime rather
 * than four lines each running their own clock.
 *
 * An error gets the longer dwell, not a different rule. Only a non-finite
 * `lifetimeMilliseconds` makes an entry permanent (`expiresAt: null`).
 */
export const pushNotification = (
	entries: readonly NotificationEntry[],
	{ text, severity = "info", now, id, lifetimeMilliseconds, maximum = NOTIFICATION_MAXIMUM }: PushOptions,
): NotificationEntry[] => {
	const dwell =
		lifetimeMilliseconds ??
		(severity === "error" ? NOTIFICATION_ERROR_LIFETIME_MILLISECONDS : NOTIFICATION_LIFETIME_MILLISECONDS);
	const expiresAt = Number.isFinite(dwell) ? now + dwell : null;
	const newest = entries[entries.length - 1];
	if (newest && newest.text === text && newest.severity === severity) {
		const collapsed = [...entries];
		collapsed[collapsed.length - 1] = { ...newest, count: newest.count + 1, expiresAt, dwell };
		return collapsed;
	}
	const appended = [...entries, { id, text, severity, count: 1, expiresAt, dwell }];
	/* over the cap, the oldest goes — but an unread error outlives a
	   confirmation, so confirmations are dropped first. Still true with
	   errors expiring: a longer dwell is not much use if the next four
	   "tab moved"s push the failure off the bottom. */
	while (appended.length > maximum) {
		const oldestInfo = appended.findIndex((entry) => entry.severity !== "error");
		appended.splice(oldestInfo === -1 ? 0 : oldestInfo, 1);
	}
	return appended;
};

/**
 * Drop everything due at `now`.
 *
 * Expiry is a deadline compared against the clock, never "the timer fired, so
 * remove one" — agent browser panes and hidden tabs throttle timers hard (a
 * chained `setTimeout` can fall to one a minute), and a queue that trusted
 * its timer would clear one entry per tick long after all of them were stale.
 * Overdue entries all go together whenever the tick actually lands.
 */
export const expireNotifications = (entries: readonly NotificationEntry[], now: number): NotificationEntry[] =>
	entries.filter((entry) => entry.expiresAt === null || entry.expiresAt > now);

/** The earliest expiry, so the view schedules ONE timer rather than one each. */
export const nextNotificationDeadline = (entries: readonly NotificationEntry[]): number | null => {
	let soonest: number | null = null;
	for (const entry of entries) {
		if (entry.expiresAt === null) {
			continue;
		}
		if (soonest === null || entry.expiresAt < soonest) {
			soonest = entry.expiresAt;
		}
	}
	return soonest;
};
