/**
 * Damage tracks (`.` healthy, `/` Superficial, `x` Aggravated, stored healthy first), with damage
 * applied as the bot's `VChar.set_damage(..., wrap=True)` does, so a preview matches what the bot
 * will save.
 */

import { bloodPotency, isVampiric } from '$lib/rules/vampire';

/** A track of a length with these amounts of damage, as the bot builds it: healthy first, keeping
 * the rightmost boxes when the damage outgrows the track (so Aggravated outlasts Superficial). */
const build = (length: number, superficial: number, aggravated: number): string =>
	(
		'.'.repeat(Math.max(0, length - superficial - aggravated)) +
		'/'.repeat(superficial) +
		'x'.repeat(aggravated)
	).slice(-length);

/** How many boxes of a kind a track has. */
export const countBoxes = (track: string, kind: string): number =>
	[...track].filter((box) => box === kind).length;

/**
 * A track after taking damage. Superficial applies first: it fills healthy boxes, and once there are
 * none, each extra point adds an Aggravated box instead (so it keeps wrapping until the track is all
 * Aggravated). Then Aggravated: it fills healthy boxes, then replaces Superficial ones. This order
 * means each point of either adds exactly one box of its kind, even on a wrapped track; the other
 * order lets an Aggravated point take a healthy box the Superficial would have filled, making it
 * wrap once more. The bot's endpoint must apply them in the same order.
 */
export const takeDamage = (track: string, superficial: number, aggravated: number): string => {
	const length = track.length;
	let sup = countBoxes(track, '/');
	let agg = countBoxes(track, 'x');

	// Superficial (wraps into Aggravated)
	sup += superficial;
	const overflow = sup + agg - length;
	if (overflow > 0) agg += overflow;
	const afterSuperficial = build(length, sup, agg);
	sup = countBoxes(afterSuperficial, '/');
	agg = countBoxes(afterSuperficial, 'x');

	// Aggravated (no wrap): the build drops Superficial boxes it crowds out
	agg += aggravated;
	return build(length, sup, agg);
};

/** A track after healing up to `amount` boxes of one kind, as the bot mends them. */
export const healDamage = (
	track: string,
	kind: 'superficial' | 'aggravated',
	amount: number
): string => {
	let sup = countBoxes(track, '/');
	let agg = countBoxes(track, 'x');
	if (kind === 'superficial') sup = Math.max(0, sup - amount);
	else agg = Math.max(0, agg - amount);
	return build(track.length, sup, agg);
};

// Superficial Health a vampire mends, by Blood Potency (the bot's `VChar.mend_amount`)
const VAMPIRE_MENDS = [1, 1, 2, 2, 3, 3, 3, 3, 4, 4, 5];

/** A character's rating in a trait, or 0. */
const rating = (traits: { name: string; rating: number }[], name: string): number =>
	traits.find((t) => t.name.toLowerCase() === name)?.rating ?? 0;

/**
 * How many boxes a heal can mend, as the bot heals them: Aggravated, one; Superficial Health, by
 * Blood Potency for vampires (thin-bloods too), or Stamina for others; Superficial Willpower, what a
 * night's rest gives (the higher of Resolve and Composure).
 */
export const mendAmount = (
	character: {
		splat: string;
		potency?: number;
		blood_potency?: number;
		traits: { name: string; rating: number }[];
	},
	kind: 'superficial' | 'aggravated',
	track: 'health' | 'willpower'
): number => {
	if (kind === 'aggravated') return 1;
	if (track === 'willpower') {
		return Math.max(rating(character.traits, 'resolve'), rating(character.traits, 'composure'));
	}
	if (isVampiric(character.splat)) {
		return VAMPIRE_MENDS[Math.max(0, Math.min(10, bloodPotency(character)))];
	}
	return rating(character.traits, 'stamina');
};
