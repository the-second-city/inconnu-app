/** The time left before a deadline, in milliseconds, never below 0. */
export const timeLeft = (deadline: number, now: number): number => Math.max(0, deadline - now);

/**
 * Time left as a clock reads it: "29:41", or "1:05:00" past an hour. Rounded up to the second,
 * so it reads 0:00 only once the time is up.
 */
export function formatTimeLeft(ms: number): string {
	const total = Math.ceil(ms / 1000);
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = `${total % 60}`.padStart(2, '0');
	return hours > 0
		? `${hours}:${`${minutes}`.padStart(2, '0')}:${seconds}`
		: `${minutes}:${seconds}`;
}

/** How urgent the time left is: a warning under 5 minutes, an error under 1. */
export function urgency(ms: number): 'calm' | 'warning' | 'error' {
	if (ms < 60_000) return 'error';
	if (ms < 5 * 60_000) return 'warning';
	return 'calm';
}
