import { expect, test } from 'vitest';

import { countSuccesses, difficultyName, isSuccess, successesLast } from '$lib/rules/dice';

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

test.each<[number[], number]>([
	[[], 0],
	[[1, 5, 6, 9], 2],
	[[10, 3], 1],
	[[10, 10, 2], 4], // A critical pair
	[[10, 10, 10], 5]
])('%j has %i successes', (dice, successes) => {
	expect(countSuccesses(dice)).toBe(successes);
});

test.each<[number, string]>([
	[0, 'None'],
	[1, 'Routine'],
	[2, 'Straightforward'],
	[3, 'Moderate'],
	[4, 'Challenging'],
	[5, 'Hard'],
	[6, 'Very Hard'],
	[7, 'Nearly Impossible'],
	[8, 'Uh, sure'],
	[9, 'Yeah, right'],
	[10, 'How often do you even roll this?'],
	[11, 'LOL'],
	[100, 'LOL']
])('Difficulty %i is %s', (difficulty, name) => {
	expect(difficultyName(difficulty)).toBe(name);
});
