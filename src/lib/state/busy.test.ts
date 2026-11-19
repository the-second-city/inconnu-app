import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { atLeast, BUSY_DELAY } from '$lib/state/busy';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

/** Whether a promise has settled, without waiting for it. */
const settled = async (promise: Promise<unknown>): Promise<boolean> => {
	let done = false;
	promise.then(() => (done = true));
	await vi.advanceTimersByTimeAsync(0);
	return done;
};

test('quick work still takes the busy delay, then gives its result', async () => {
	const waiting = atLeast(Promise.resolve('done'));

	await vi.advanceTimersByTimeAsync(BUSY_DELAY - 1);
	expect(await settled(waiting)).toBe(false);
	await vi.advanceTimersByTimeAsync(1);
	await expect(waiting).resolves.toBe('done');
});

test('slow work takes as long as it takes, with no delay added', async () => {
	const work = new Promise((resolve) => setTimeout(() => resolve('slow'), 2000));
	const waiting = atLeast(work, 750);

	await vi.advanceTimersByTimeAsync(1999);
	expect(await settled(waiting)).toBe(false);
	await vi.advanceTimersByTimeAsync(1);
	await expect(waiting).resolves.toBe('slow');
});
