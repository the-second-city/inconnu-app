import { expect, test } from 'vitest';

import { countBoxes, healDamage, mendAmount, takeDamage } from '$lib/damage';

test.each([
	// [track, superficial, aggravated, expected]
	['.....', 0, 0, '.....'],
	['.....', 2, 0, '...//'],
	['.....', 0, 2, '...xx'],
	['.....', 1, 1, '.../x'],
	// Superficial with no healthy boxes left wraps into Aggravated
	['..///', 3, 0, '////x'], // Two fill the healthy boxes; the third wraps
	['/////', 1, 0, '////x'],
	['/////', 9, 0, 'xxxxx'],
	// Aggravated with no healthy boxes left replaces Superficial
	['..///', 0, 3, '//xxx'],
	['/////', 0, 2, '///xx'],
	['/////', 0, 9, 'xxxxx'],
	// Both: Superficial first, then Aggravated
	['..///', 3, 1, '///xx'],
	// Superficial keeps wrapping past the track's length, until it's all Aggravated
	['........//x', 18, 0, 'xxxxxxxxxxx'],
	['........//x', 17, 0, '/xxxxxxxxxx'],
	['xxxxx', 1, 1, 'xxxxx']
])('%s taking %i Superficial and %i Aggravated is %s', (track, sup, agg, expected) => {
	expect(takeDamage(track, sup, agg)).toBe(expected);
});

test('the track keeps its length', () => {
	for (const track of ['...', '....//', 'xxxxx', '.........']) {
		expect(takeDamage(track, 7, 4)).toHaveLength(track.length);
	}
});

test('countBoxes counts a kind of box', () => {
	expect(countBoxes('..//x', '/')).toBe(2);
	expect(countBoxes('..//x', 'x')).toBe(1);
	expect(countBoxes('..//x', '.')).toBe(2);
});

test('on a wrapped track, each Aggravated point adds exactly one Aggravated box', () => {
	// 1 Aggravated, 2 Superficial, 8 healthy; 11 Superficial wraps it to 4 Aggravated
	const wrapped = takeDamage('........//x', 11, 0);
	expect(countBoxes(wrapped, 'x')).toBe(4);

	expect(countBoxes(takeDamage('........//x', 11, 1), 'x')).toBe(5);
	expect(countBoxes(takeDamage('........//x', 11, 2), 'x')).toBe(6);
});

test.each([
	// [track, kind, amount, healed]
	['..//x', 'superficial', 1, '.../x'],
	['..//x', 'superficial', 5, '....x'], // No more than there is
	['..//x', 'aggravated', 1, '...//'],
	['/xx', 'aggravated', 1, './x']
] as const)('healing %j of %s %i leaves %j', (track, kind, amount, healed) => {
	expect(healDamage(track, kind, amount)).toBe(healed);
});

/** A character of a splat and Blood Potency, with some traits. */
const healer = (splat: string, potency = 0, traits: [string, number][] = []) => ({
	splat,
	potency,
	traits: traits.map(([name, rating]) => ({ name, rating }))
});

test.each([
	// [character, kind, track, amount]
	[healer('vampire', 1), 'superficial', 'health', 1],
	[healer('vampire', 2), 'superficial', 'health', 2],
	[healer('vampire', 4), 'superficial', 'health', 3],
	[healer('vampire', 8), 'superficial', 'health', 4],
	[healer('vampire', 10), 'superficial', 'health', 5],
	[healer('thin-blood', 0), 'superficial', 'health', 1],
	[healer('mortal', 0, [['Stamina', 3]]), 'superficial', 'health', 3],
	[healer('ghoul', 0, [['Stamina', 2]]), 'superficial', 'health', 2],
	[healer('vampire', 3), 'aggravated', 'health', 1],
	[
		healer('vampire', 3, [
			['Resolve', 2],
			['Composure', 4]
		]),
		'superficial',
		'willpower',
		4
	],
	[healer('mortal', 0, [['Resolve', 2]]), 'aggravated', 'willpower', 1]
] as const)('%o mends %s %s: %i', (character, kind, track, amount) => {
	expect(mendAmount(character, kind, track)).toBe(amount);
});
