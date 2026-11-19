import { expect, test } from 'vitest';

import { dreamRerolled, frenzyPool, penaltyDice } from './frenzy';
import type { Character, FrenzyPenalty, FrenzyAdvantage } from '$lib/types';

/** A vampire with a Willpower track, Humanity, and Blood Potency. */
const character = (willpower: string, humanity: number, potency = 3): Character => ({
	_id: 'abc',
	name: 'Nadia',
	guild: '111',
	user: '222',
	splat: 'vampire',
	profile: { description: null, biography: null, images: [] },
	health: '......',
	willpower,
	humanity,
	stains: 0,
	potency,
	traits: []
});

test('the pool is undamaged Willpower plus a third of Humanity, at least 1', () => {
	expect(frenzyPool(character('./x/', 7)).total).toBe(1 + 2);
	expect(frenzyPool(character('xxx', 2)).total).toBe(1);
});

test.each<[FrenzyPenalty | null, number, number]>([
	[null, 3, 0],
	['brujah', 3, 3], // Bane Severity at BP 3
	['brujah', 0, 0],
	['malkavian', 3, 2]
])('penalty %s at Blood Potency %i takes %i dice', (penalty, potency, dice) => {
	expect(penaltyDice(penalty, potency)).toBe(dice);
});

test('a penalty leaves at least 1 die, and bonus dice and advantages add after it', () => {
	// 3 Willpower + 2 for Humanity 7 = 5, less Bane Severity 6 at BP 10
	const pool = frenzyPool(character('...', 7, 10), {
		penalty: 'brujah',
		bonus: 3,
		advantages: ['gentle_mind', 'cold_dead_hunger']
	});
	expect(pool).toMatchObject({ resist: 5, removed: 4, advantageDice: 6, total: 1 + 3 + 6 });
});

test.each<[FrenzyAdvantage, number]>([
	['cold_dead_hunger', 2],
	['the_dream', 0],
	['gentle_mind', 4],
	['jewel_in_the_garden', 4],
	['the_heart_of_darkness', 2]
])('%s adds %i dice', (advantage, dice) => {
	expect(frenzyPool(character('...', 6), { advantages: [advantage] }).advantageDice).toBe(dice);
});

test("The Dream re-rolls the first 3 failures, as the bot's reroll_failures", () => {
	expect(dreamRerolled([6, 2, 9, 1, 5, 3, 4])).toEqual([1, 3, 4]);
	expect(dreamRerolled([7, 8])).toEqual([]);
});
