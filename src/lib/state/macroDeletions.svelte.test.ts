import { beforeEach, expect, test, vi } from 'vitest';

import { MacroDeletions } from './macroDeletions.svelte';
import type { Macro } from '$lib/types';

const deleteMacro = vi.hoisted(() => vi.fn());
vi.mock('$lib/api/macros', () => ({ deleteMacro }));
// No busy delay: the deletes' own promises decide when they're done
vi.mock('$lib/state/busy', () => ({ atLeast: <T>(work: Promise<T>): Promise<T> => work }));

beforeEach(() => {
	deleteMacro.mockReset().mockResolvedValue({ result: null });
});

/** Macros with these names (the rest doesn't matter here). */
const macros = (...names: string[]): Macro[] =>
	names.map((name) => ({ name, pool: [] }) as unknown as Macro);

test('marked macros stay shown but not standing; discard brings them back', () => {
	const deletions = new MacroDeletions();
	deletions.marked.add('hunt');

	expect(deletions.shown(macros('feed', 'hunt')).map((m) => m.name)).toEqual(['feed', 'hunt']);
	expect(deletions.standing(macros('feed', 'hunt')).map((m) => m.name)).toEqual(['feed']);

	deletions.discard();
	expect(deletions.standing(macros('feed', 'hunt'))).toHaveLength(2);
});

test('saving deletes each marked macro in turn, hiding it until the macros lack it', async () => {
	const deletions = new MacroDeletions();
	deletions.marked.add('feed');
	deletions.marked.add('hunt');

	expect(await deletions.save('abc')).toBe(true);

	expect(deleteMacro.mock.calls).toEqual([
		['abc', 'feed'],
		['abc', 'hunt']
	]);
	expect(deletions.shown(macros('feed', 'hunt', 'lurk')).map((m) => m.name)).toEqual(['lurk']);
	deletions.sync(macros('feed', 'lurk')); // An update without hunt, but still with feed
	expect(deletions.removed.has('hunt')).toBe(false);
	expect(deletions.removed.has('feed')).toBe(true);
});

test('the first failure stops the deletes, keeping the rest marked and saying which', async () => {
	deleteMacro.mockResolvedValueOnce({ result: null }).mockResolvedValueOnce({ error: 'Nope.' });
	const deletions = new MacroDeletions();
	for (const name of ['feed', 'hunt', 'lurk']) deletions.marked.add(name);

	expect(await deletions.save('abc')).toBe(false);

	expect(deleteMacro).toHaveBeenCalledTimes(2);
	expect([...deletions.marked]).toEqual(['hunt', 'lurk']);
	expect(deletions.submit.error).toBe('Couldn’t delete hunt. Nope.');
});

test('a marked macro that goes away elsewhere is unmarked, but not mid-save', () => {
	const deletions = new MacroDeletions();
	deletions.marked.add('feed');
	deletions.marked.add('hunt');

	deletions.submit.busy = true;
	deletions.sync(macros('feed'));
	expect([...deletions.marked]).toEqual(['feed', 'hunt']);

	deletions.submit.busy = false;
	deletions.sync(macros('feed'));
	expect([...deletions.marked]).toEqual(['feed']);
});

test.each([
	[[null, 'Nope.'], 1],
	[['Nope.'], 0]
])('a save whose deletes end in %j refetches %i times', async (errors, times) => {
	for (const error of errors) {
		deleteMacro.mockResolvedValueOnce(error === null ? { result: null } : { error });
	}
	const deletions = new MacroDeletions();
	deletions.marked.add('feed');
	deletions.marked.add('hunt');
	const refetch = vi.fn(async () => {});

	await deletions.save('abc', refetch);

	expect(refetch).toHaveBeenCalledTimes(times);
});
