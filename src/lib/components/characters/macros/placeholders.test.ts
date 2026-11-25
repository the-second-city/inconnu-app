import { expect, test, vi } from 'vitest';

import { macroNameError } from '$lib/constraints';
import { TEST_CONSTRAINTS } from '$lib/testing/constraints';
import { NAME_PLACEHOLDERS, randomPlaceholder } from './placeholders';

test.each(NAME_PLACEHOLDERS)('%s is a valid macro name', (name) => {
	expect(macroNameError(name, [], TEST_CONSTRAINTS)).toBeNull();
});

test('there are no repeats', () => {
	expect(new Set(NAME_PLACEHOLDERS).size).toBe(NAME_PLACEHOLDERS.length);
});

test.each([
	[0, NAME_PLACEHOLDERS[0]],
	[0.9999, NAME_PLACEHOLDERS.at(-1)]
])('a random %d picks %s', (random, name) => {
	vi.spyOn(Math, 'random').mockReturnValueOnce(random);
	expect(randomPlaceholder()).toBe(name);
});
