/** Roll macros' pools, read as the bot rolls them. */
import { plural } from '$lib';
import { nameKey } from '$lib/constraints';
import { baneSeverity } from '$lib/rules/remorse';
import { bloodPotency, isVampiric, powerBonus } from '$lib/rules/vampire';
import type { Character, Macro } from '$lib/types';

/** The separator between a pool token's trait and its specialties ("Brawl.Kindred"). */
export const KEY_DELIMITER = '.';

/** Whether a pool token is a number of dice, not a trait. */
export const isNumberToken = (token: string): boolean => /^\d+$/.test(token);

/** A pool's terms as written: each token (a trait key or a number) with the sign before it. */
export interface PoolPart {
	sign: '+' | '-';
	token: string;
}

/** Split a pool's tokens ("Strength", "+", "Brawl.Kindred") into its terms, each with its sign. */
export const parsePool = (pool: string[]): PoolPart[] => {
	const parts: PoolPart[] = [];
	let sign: PoolPart['sign'] = '+';
	for (const token of pool) {
		if (token === '-') {
			sign = sign === '-' ? '+' : '-'; // Stacked operators ("3 - - 2") combine, as the bot reads them
		} else if (token !== '+') {
			parts.push({ sign, token });
			sign = '+';
		}
	}
	return parts;
};

/** One term of a macro's pool: a trait (with any specialties or powers) or a number. */
export interface PoolTerm {
	sign: '+' | '-';
	kind: 'trait' | 'number';
	name: string; // The trait's name as the character has it now, or the number
	specialties: string[]; // Specialties, or a Discipline's powers
	dice: number | null; // What it adds; null when the character lacks it
	missing: string | null; // The trait or specialty the character lacks
	discipline: boolean; // A Discipline the character has
}

/** A macro's pool, resolved against a character's current traits. */
export interface ResolvedPool {
	terms: PoolTerm[];
	dice: number | null; // The total; null when a term can't be resolved
	powerBonus: number; // The Blood Potency dice in the total, for using a Discipline
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
	if (isNumberToken(token)) {
		return {
			sign,
			kind: 'number',
			name: token,
			specialties: [],
			dice: Number(token),
			missing: null,
			discipline: false
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
			missing: found ? null : name,
			discipline: false
		};
	}

	// The specialties as the character names them now
	const named = specialties.map(
		(specialty) => trait.subtraits.find((s) => nameKey(s) === nameKey(specialty)) ?? specialty
	);
	const missing = specialties.find(
		(specialty) => !trait.subtraits.some((s) => nameKey(s) === nameKey(specialty))
	);
	const discipline = trait.type === 'discipline';
	const bonus = discipline ? 0 : specialties.length;
	return {
		sign,
		kind: 'trait',
		name: trait.name,
		specialties: named,
		dice: missing === undefined ? trait.rating + bonus : null,
		missing: missing ?? null,
		discipline
	};
};

/**
 * A macro's pool, resolved against the character's current traits: each term with its dice, and
 * the total (at least 1, as the bot rolls; an empty pool, a macro that only Rouses, has 0). Using a
 * Discipline, added or subtracted, adds a vampire's power bonus once. A term the character no longer
 * has (a removed trait or specialty) has no dice, and neither does the total.
 */
export const resolvePool = (pool: string[], character: Character): ResolvedPool => {
	const inherent = inherentRatings(character);
	const terms = parsePool(pool).map(({ sign, token }) =>
		resolveTerm(token, sign, character, inherent)
	);

	const resolved = terms.every((term) => term.dice !== null);
	const total = terms.reduce(
		(sum, term) => sum + (term.sign === '-' ? -1 : 1) * (term.dice ?? 0),
		0
	);
	const disciplined = terms.some((term) => term.discipline);
	const bonus =
		disciplined && isVampiric(character.splat) ? powerBonus(bloodPotency(character)) : 0;
	// The bot always rolls at least one die
	const dice = !resolved ? null : terms.length === 0 ? 0 : Math.max(1, total + bonus);
	return { terms, dice, powerBonus: bonus };
};

/** The macros whose pools roll a trait (by name, ignoring case and spaces, as the bot matches). */
export const macrosUsing = (macros: Macro[], trait: string): Macro[] => {
	const key = nameKey(trait);
	return macros.filter((macro) =>
		parsePool(macro.pool).some(
			({ token }) => !isNumberToken(token) && nameKey(token.split(KEY_DELIMITER)[0]) === key
		)
	);
};

/** A pool's dice, as the macros show them: "5 dice", or "? dice" while a trait is missing. */
export const diceLabel = (dice: number | null): string =>
	dice === null ? '? dice' : plural(dice, 'die', 'dice');

/**
 * What a term lacks, as the sheet would name it: a trait ("Melee"), or a trait's specialty
 * ("Occult (Bahari)"). Null when it lacks nothing.
 */
export const missingLabel = (term: PoolTerm): string | null => {
	if (term.missing === null) return null;
	return term.missing === term.name ? term.name : `${term.name} (${term.missing})`;
};
