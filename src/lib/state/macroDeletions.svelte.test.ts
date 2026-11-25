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
