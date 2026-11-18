import { expect, test, vi } from 'vitest';

import type { ActionOutcome } from '$lib/characterActions';
import { BusySubmit } from './busySubmit.svelte';

// No busy delay: the work's own promise decides when it's done
vi.mock('$lib/busy', () => ({ atLeast: <T>(work: Promise<T>): Promise<T> => work }));

/** A request answering with `outcome`. */
const answer =
	<T>(outcome: ActionOutcome<T>) =>
	(): Promise<ActionOutcome<T>> =>
		Promise.resolve(outcome);

test('starts idle, with no error', () => {
	const submit = new BusySubmit();

	expect(submit.busy).toBe(false);
	expect(submit.error).toBeNull();
});

test('success returns the result and keeps spinning, so the modal can close', async () => {
	const submit = new BusySubmit();

	expect(await submit.run(answer({ result: null }))).toEqual({ result: null });
	expect(submit.busy).toBe(true);
});

test('an error brings the content back, saying why', async () => {
	const submit = new BusySubmit();

	expect(await submit.run(answer({ error: 'Not enough Hunger' }))).toBeNull();
	expect(submit.busy).toBe(false);
	expect(submit.error).toBe('Not enough Hunger');
});

test('a second submit while one runs does nothing', async () => {
	const submit = new BusySubmit();
	const request = vi.fn(answer({ result: 1 }));
	let respond: (outcome: ActionOutcome<number>) => void = () => {};
	const pending = submit.run(
		() => new Promise<ActionOutcome<number>>((resolve) => (respond = resolve))
	);

	expect(await submit.run(request)).toBeNull();
	expect(request).not.toHaveBeenCalled();
	respond({ result: 2 });
	expect(await pending).toEqual({ result: 2 });
});

test('submitting again clears the last error, and reset starts over', async () => {
	const submit = new BusySubmit();
	await submit.run(answer({ error: 'Oops' }));

	await submit.run(answer({ result: 'ok' }));
	expect(submit.error).toBeNull();

	submit.reset();
	expect([submit.busy, submit.error]).toEqual([false, null]);
});
