/**
 * Submitting takes a moment, however fast the API answers: modals show a spinner (and Save spins)
 * for at least this long, so every save and action feels alike, and like work got done.
 */
export const BUSY_DELAY = 750;

/** Wait `ms` milliseconds. */
export const wait = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/** Wait for some work, taking at least `ms` (the two run together, so a slow request adds none). */
export const atLeast = async <T>(work: Promise<T>, ms: number = BUSY_DELAY): Promise<T> => {
	const [result] = await Promise.all([work, wait(ms)]);
	return result;
};
