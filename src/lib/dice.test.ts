import { expect, test } from 'vitest';

import { isSuccess, successesLast } from '$lib/dice';

test.each([
	[1, false],
	[5, false],
	[6, true],
	[10, true]
])('a %i succeeds: %s', (die, success) => {
	expect(isSuccess(die)).toBe(success);
});

test('successes move to the end, each group in the order rolled', () => {
	expect(successesLast([8, 2, 6, 4])).toEqual([2, 4, 8, 6]);
	expect(successesLast([])).toEqual([]);
});
