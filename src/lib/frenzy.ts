/** Frenzy tests, as the bot's `frenzy_roll` makes them. */

import { isSuccess } from '$lib/dice';
import { baneSeverity } from '$lib/remorse';
import { bloodPotency } from '$lib/vampire';
import type { Character, FrenzyPenalty, FrenzyAdvantage } from '$lib/types';

/** The Difficulties offered. */
export const FRENZY_DIFFICULTY = { min: 1, max: 10 };

/** The most flat bonus dice, as the bot's `MAX_FRENZY_BONUS`. */
export const MAX_FRENZY_BONUS = 7;

/** The Dream re-rolls up to this many failures, as the bot's `reroll_failures`. */
export const DREAM_REROLLS = 3;

/** An advantage that aids in resisting frenzy: extra dice, or (The Dream) re-rolling failures. */
export interface FrenzyAdvantageOption {
	value: FrenzyAdvantage;
	name: string;
	dice: number; // Extra dice (none for The Dream)
}

/** The advantages, in Discord's order, with the bot's `FrenzyAdvantage` names and dice. */
export const FRENZY_ADVANTAGES: FrenzyAdvantageOption[] = [
	{ value: 'cold_dead_hunger', name: 'Cold Dead Hunger', dice: 2 },
	{ value: 'the_dream', name: 'The Dream', dice: 0 },
	{ value: 'gentle_mind', name: 'Gentle Mind', dice: 4 },
	{ value: 'jewel_in_the_garden', name: 'Jewel in the Garden', dice: 4 },
	{ value: 'the_heart_of_darkness', name: 'The Heart of Darkness', dice: 2 }
];

/** A frenzy test's dice: the resistance pool, what the penalty takes, and what bonuses add. */
export interface FrenzyPool {
	resist: number; // Undamaged Willpower plus a third of Humanity, at least 1
	willpower: number;
	humanity: number;
	humanityThird: number;
	removed: number; // Taken by the penalty (the pool keeps at least 1)
	bonus: number; // Flat bonus dice
	applied: FrenzyAdvantageOption[]; // The advantages taken, in display order
	advantageDice: number; // Added by advantages
	total: number;
}

/** How many dice the Brujah or Malkavian penalty takes, before keeping at least one. */
export const penaltyDice = (penalty: FrenzyPenalty | null, potency: number): number => {
	if (penalty === 'brujah') return baneSeverity(potency);
	if (penalty === 'malkavian') return 2;
	return 0;
};

/**
 * A character's frenzy test pool, as the bot's `frenzy_roll`: `frenzy_resist` (undamaged Willpower
 * plus a third of Humanity, at least 1), less the penalty (keeping at least 1), plus the flat bonus
 * and the advantages' dice.
 */
export const frenzyPool = (
	character: Character,
	{
		penalty = null,
		bonus = 0,
		advantages = []
	}: { penalty?: FrenzyPenalty | null; bonus?: number; advantages?: FrenzyAdvantage[] } = {}
): FrenzyPool => {
	const willpower = [...character.willpower].filter((box) => box === '.').length;
	const humanity = character.humanity ?? 7;
	const humanityThird = Math.floor(humanity / 3);
	const resist = Math.max(willpower + humanityThird, 1);
	const penalized = Math.max(resist - penaltyDice(penalty, bloodPotency(character)), 1);
	const applied = FRENZY_ADVANTAGES.filter((advantage) => advantages.includes(advantage.value));
	const advantageDice = applied.reduce((sum, advantage) => sum + advantage.dice, 0);
	return {
		resist,
		willpower,
		humanity,
		humanityThird,
		removed: resist - penalized,
		bonus,
		applied,
		advantageDice,
		total: penalized + bonus + advantageDice
	};
};

/**
 * Which dice The Dream re-rolled: the first `DREAM_REROLLS` failures among the original faces, as
 * the bot's `reroll_failures` picks them (a re-roll can land on the same face, so it can't be told
 * by comparing).
 */
export const dreamRerolled = (original: number[]): number[] =>
	[...original.keys()].filter((i) => !isSuccess(original[i])).slice(0, DREAM_REROLLS);
