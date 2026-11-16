import { expect, test } from 'vitest';

import { countBoxes, takeDamage } from '$lib/damage';

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
