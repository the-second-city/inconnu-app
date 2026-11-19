import { expect, test, vi } from 'vitest';

import type { ActionOutcome } from '$lib/api/characterActions';
import { RollInPlace } from './rollInPlace.svelte';

// No busy delay: the work's own promise decides when it's done
vi.mock('$lib/state/busy', () => ({ atLeast: <T>(work: Promise<T>): Promise<T> => work }));

/** A stand-in character: just what changes under a roll. */
interface Sheet {
	humanity: number;
}

/** A roll following a character held in state, which tests change as a live update would. */
const setup = (): { sheet: Sheet; roll: RollInPlace<Sheet> } => {
	const sheet = $state({ humanity: 7 });
	return { sheet, roll: new RollInPlace(() => sheet) };
};

/** A request answering with `outcome`. */
const answer =
	<T>(outcome: ActionOutcome<T>) =>
	(): Promise<ActionOutcome<T>> =>
		Promise.resolve(outcome);

test('starts at the options, showing the character as it is', () => {
	const { sheet, roll } = setup();

	expect(roll.phase).toBe('options');
	expect(roll.locked).toBe(false);
	expect(roll.shown.humanity).toBe(7);
	sheet.humanity = 6;
	expect(roll.shown.humanity).toBe(6);
});

test('a roll returns the result and keeps the character as it began', async () => {
	const { sheet, roll } = setup();

	const result = await roll.roll(answer({ result: 'rolled' }), 0);

	expect(result).toBe('rolled');
	expect(roll.phase).toBe('revealing');
	expect(roll.locked).toBe(true);
	sheet.humanity = 6; // The roll's live update, mid-reveal
	expect(roll.shown.humanity).toBe(7);
	roll.finish();
	expect(roll.done).toBe(true);
});

test('locks while the request runs, refusing a second roll', async () => {
	const { roll } = setup();
	let respond: (outcome: ActionOutcome<string>) => void = () => {};
	const pending = roll.roll(
		() => new Promise<ActionOutcome<string>>((resolve) => (respond = resolve)),
		0
	);

	expect(roll.phase).toBe('rolling');
	expect(await roll.roll(answer({ result: 'again' }), 0)).toBeNull();
	respond({ result: 'first' });
	expect(await pending).toBe('first');
});

test('an error unlocks the options again, saying why', async () => {
	const { sheet, roll } = setup();

	expect(await roll.roll(answer({ error: 'No Stains to roll for' }), 0)).toBeNull();

	expect(roll.phase).toBe('options');
	expect(roll.error).toBe('No Stains to roll for');
	sheet.humanity = 5;
	expect(roll.shown.humanity).toBe(5);
});

test('rolling again clears the last error, and reset starts over', async () => {
	const { roll } = setup();
	await roll.roll(answer({ error: 'Oops' }), 0);

	await roll.roll(answer({ result: 'ok' }), 0);
	expect(roll.error).toBeNull();

	roll.reset();
	expect(roll.phase).toBe('options');
	expect(roll.locked).toBe(false);
});

test('rolling and closable follow the phase', async () => {
	const { roll } = setup();
	expect([roll.rolling, roll.closable]).toEqual([false, true]);

	await roll.roll(answer({ result: 'ok' }), 0);
	expect([roll.rolling, roll.closable]).toEqual([true, false]); // Revealing

	roll.finish();
	expect([roll.rolling, roll.closable]).toEqual([false, true]);
});

test('a roll reset while its request runs is dropped, leaving the new view alone', async () => {
	const { sheet, roll } = setup();
	let respond: (outcome: ActionOutcome<string>) => void = () => {};
	const pending = roll.roll(
		() => new Promise<ActionOutcome<string>>((resolve) => (respond = resolve)),
		0
	);

	roll.reset(); // The modal reopened
	respond({ result: 'stale' });

	expect(await pending).toBeNull();
	expect(roll.phase).toBe('options');
	sheet.humanity = 4;
	expect(roll.shown.humanity).toBe(4);
});

test('a roll reset while its dice reveal does not finish on the new view', async () => {
	const { roll } = setup();
	await roll.roll(answer({ result: 'ok' }), 0);

	roll.reset();
	roll.finish(); // The old reveal ending

	expect(roll.phase).toBe('options');
});
