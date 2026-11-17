import { expect, test } from 'vitest';

import { baneSeverity, remorseDice, remorseSuccess } from '$lib/remorse';

test.each([
	[0, 0],
	[1, 2],
	[2, 2],
	[3, 3],
	[4, 3],
	[5, 4],
	[9, 6],
	[10, 6]
])('at Blood Potency %i, Bane Severity is %i', (potency, severity) => {
	expect(baneSeverity(potency)).toBe(severity);
});

test.each([
	// [humanity, stains, dice]
	[7, 1, 2], // One die per box neither filled nor Stained
	[7, 0, 3],
	[7, 3, 1], // None left: still one
	[9, 4, 1], // Stains overflowing Humanity: still one
	[0, 1, 9]
])('at Humanity %i with %i Stains, Remorse rolls %i dice', (humanity, stains, dice) => {
	expect(remorseDice(humanity, stains)).toBe(dice);
});

test('a minimum raises the dice to it, but never lowers them', () => {
	expect(remorseDice(7, 2, { minimum: 3 })).toBe(3);
	expect(remorseDice(4, 1, { minimum: 3 })).toBe(5);
});

test.each([
	// [humanity, stains, bane, dice]
	[3, 1, 2, 4],
	[7, 1, 2, 1], // Never below one
	[7, 1, 0, 2]
])(
	'at Humanity %i with %i Stains, the Lasombra Bane (Severity %i) rolls %i',
	(humanity, stains, bane, dice) => {
		expect(remorseDice(humanity, stains, { lasombraBane: bane })).toBe(dice);
	}
);

test.each([
	[5, false],
	[6, true],
	[10, true]
])('a Remorse die of %i succeeds: %s', (die, success) => {
	expect(remorseSuccess(die)).toBe(success);
});
