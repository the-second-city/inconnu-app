/** Roll macros' pools, read as the bot rolls them. */
import { nameKey } from '$lib/constraints';
import { baneSeverity } from '$lib/rules/remorse';
import { bloodPotency, isVampiric } from '$lib/rules/vampire';
import type { Character, Macro } from '$lib/types';

/** The separator between a pool token's trait and its specialties ("Brawl.Kindred"). */
export const KEY_DELIMITER = '.';

/** One term of a macro's pool: a trait (with any specialties or powers) or a number. */
export interface PoolTerm {
	sign: '+' | '-';
	kind: 'trait' | 'number';
	name: string; // The trait's name as the character has it now, or the number
	specialties: string[]; // Specialties, or a Discipline's powers
	dice: number | null; // What it adds; null when the character lacks it
	missing: string | null; // The trait or specialty the character lacks
}

/** A macro's pool, resolved against a character's current traits. */
export interface ResolvedPool {
	terms: PoolTerm[];
	dice: number | null; // The total; null when a term can't be resolved
}

/**
 * The traits every character has but that aren't on its sheet, as the bot's `_inherent_traits`:
 * undamaged Willpower and Humanity, and for vampires Hunger, Blood Potency, Surge and Bane Severity.
 */
const inherentRatings = (character: Character): Record<string, [string, number]> => {
	const ratings: Record<string, [string, number]> = {
		willpower: ['Willpower', [...character.willpower].filter((box) => box === '.').length],
		humanity: ['Humanity', character.humanity]
	};
	if (isVampiric(character.splat)) {
		const potency = bloodPotency(character);
		ratings.hunger = ['Hunger', character.hunger ?? 0];
		ratings.potency = ['Potency', potency];
		ratings.surge = ['Surge', Math.ceil(potency / 2) + 1];
		ratings.bane = ['Bane', baneSeverity(potency)];
	}
	return ratings;
};

/**
 * A pool token's term. Traits match their names ignoring case and spaces, as the bot's matching
 * does. Each specialty adds a die; a Discipline's powers add none.
 */
const resolveTerm = (
	token: string,
	sign: PoolTerm['sign'],
	character: Character,
	inherent: Record<string, [string, number]>
): PoolTerm => {
	if (/^\d+$/.test(token)) {
		return {
			sign,
			kind: 'number',
			name: token,
			specialties: [],
			dice: Number(token),
			missing: null
		};
	}

	const [name, ...specialties] = token.split(KEY_DELIMITER);
	const key = nameKey(name);
	const trait = character.traits.find((t) => nameKey(t.name) === key);
	if (!trait) {
		const found = inherent[key];
		const [inherentName, rating] = found ?? [name, null];
		return {
			sign,
			kind: 'trait',
			name: inherentName,
			specialties,
			dice: rating,
			missing: found ? null : name
		};
	}

	// The specialties as the character names them now
	const named = specialties.map(
		(specialty) => trait.subtraits.find((s) => nameKey(s) === nameKey(specialty)) ?? specialty
	);
	const missing = specialties.find(
		(specialty) => !trait.subtraits.some((s) => nameKey(s) === nameKey(specialty))
	);
	const bonus = trait.type === 'discipline' ? 0 : specialties.length;
	return {
		sign,
		kind: 'trait',
		name: trait.name,
		specialties: named,
		dice: missing === undefined ? trait.rating + bonus : null,
		missing: missing ?? null
	};
};

/**
 * A macro's pool, resolved against the character's current traits: each term with its dice, and
 * the total (at least 1, as the bot rolls; an empty pool, a macro that only Rouses, has 0). A term the character no longer has (a removed trait or specialty)
 * has no dice, and neither does the total.
 */
export const resolvePool = (pool: string[], character: Character): ResolvedPool => {
	const inherent = inherentRatings(character);
	const terms: PoolTerm[] = [];
	let sign: PoolTerm['sign'] = '+';
	for (const token of pool) {
		if (token === '+' || token === '-') {
			sign = token;
			continue;
		}
		terms.push(resolveTerm(token, sign, character, inherent));
		sign = '+';
	}

	const resolved = terms.every((term) => term.dice !== null);
	const total = terms.reduce(
		(sum, term) => sum + (term.sign === '-' ? -1 : 1) * (term.dice ?? 0),
		0
	);
	// The bot always rolls at least one die
	return { terms, dice: !resolved ? null : terms.length === 0 ? 0 : Math.max(1, total) };
};

/** The macros whose pools roll a trait (by name, ignoring case and spaces, as the bot matches). */
export const macrosUsing = (macros: Macro[], trait: string): Macro[] => {
	const key = nameKey(trait);
	return macros.filter((macro) =>
		macro.pool.some(
			(token) =>
				token !== '+' &&
				token !== '-' &&
				!/^\d+$/.test(token) &&
				nameKey(token.split(KEY_DELIMITER)[0]) === key
		)
	);
};
