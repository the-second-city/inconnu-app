/**
 * The bot's validation constraints (`Constraints`, from its `GET /constraints`), and the checks
 * built on them, so edit mode and the wizard accept what the bot accepts without copies of its
 * limits. The page that edits (the character page, the wizard) provides them by context.
 */

import { getContext, setContext } from 'svelte';

import { codePointLength, normalize } from '$lib';
import type { Constraints, Profile } from '$lib/types';

const KEY = Symbol('constraints');

/** The context's value: a getter, so fresh constraints (from a refetch) reach the components. */
type ConstraintsGetter = () => Constraints;

/** Provide the constraints to the components below, as a getter so they stay current. */
export const setConstraints = (get: ConstraintsGetter): void => {
	setContext(KEY, get);
};

/**
 * The provided constraints, as a getter. Lazy: it throws only when called without a provider, so
 * a component can read them in its editing branches and still render read-only without them.
 */
export const getConstraints = (): ConstraintsGetter => {
	const get = getContext<ConstraintsGetter | undefined>(KEY);
	return () => {
		if (!get) throw new Error('No constraints provided; call setConstraints() in a parent');
		return get();
	};
};

/** A trait name as the bot compares them: no case, no spaces ("Animal Ken" is "animalken"). */
export const nameKey = (name: string): string => name.toLowerCase().replaceAll(' ', '');

/**
 * Why a character name is invalid, or null if it's valid. As the bot's `valid_name`.
 * @param name - The name, already normalized
 * @param constraints - The bot's constraints
 * @returns The problem, as a message for the user
 */
export const characterNameError = (name: string, constraints: Constraints): string | null => {
	if (!name) return 'Name cannot be empty';
	const max = constraints.name_max_length;
	if (codePointLength(name) > max) return `Name must be ${max} characters or less`;
	if (!new RegExp(constraints.name_pattern, 'u').test(name)) {
		return 'Name can only contain letters, numbers, spaces, hyphens, underscores, and apostrophes';
	}
	return null;
};

/**
 * Why a text field (a conviction, description, or history) is too long for the bot, or null.
 * Counted in code points, as the bot's `len()` counts them.
 * @param text - The text, as it will be sent (convictions normalized)
 * @param max - The bot's limit for the field
 * @returns The problem, as a message for the user
 */
export const lengthError = (text: string, max: number): string | null =>
	codePointLength(text) > max ? `Maximum ${max} characters` : null;

/** Why each of a character's profile texts is too long for the bot (null for one that fits). */
export interface ProfileLengthErrors {
	description: string | null;
	biography: string | null; // Shown as History
	convictions: (string | null)[];
}

/**
 * Why each profile text is too long for the bot, as edit mode checks them: the description and
 * history as typed, the convictions collapsed, as Save sends them.
 * @param profile - The profile being edited
 * @param convictions - The convictions being edited
 * @param constraints - The bot's constraints
 * @returns Each field's problem, or null
 */
export const profileLengthErrors = (
	profile: Pick<Profile, 'description' | 'biography'>,
	convictions: string[],
	constraints: Constraints
): ProfileLengthErrors => ({
	description: lengthError(profile.description ?? '', constraints.profile_max_length),
	biography: lengthError(profile.biography ?? '', constraints.profile_max_length),
	convictions: convictions.map((c) => lengthError(normalize(c), constraints.conviction_max_length))
});

/**
 * The names of the fields that are too long, as the profile labels them ("Description",
 * "Conviction 2"), or none.
 * @param errors - From `profileLengthErrors`
 * @returns The fields' names, in the profile's order
 */
export const tooLongFields = (errors: ProfileLengthErrors): string[] => [
	...(errors.description ? ['Description'] : []),
	...(errors.biography ? ['History'] : []),
	...errors.convictions.flatMap((error, i) => (error ? [`Conviction ${i + 1}`] : []))
];

/**
 * The longest a field's `maxlength` can be without cutting off text the bot would accept:
 * `maxlength` counts UTF-16 code units, and a code point takes at most two.
 * @param max - The bot's limit, in code points
 * @returns The `maxlength` for the field
 */
export const maxCodeUnits = (max: number): number => max * 2;

/**
 * Why a new trait or specialty name is invalid, or null if it's valid. As the bot's
 * `validate_trait_names` and `validate_specialty_names`, but for duplicates, which the caller
 * checks (by `nameKey`) against its own list.
 * @param name - The name, already normalized
 * @param constraints - The bot's constraints
 * @param specialty - Whether it's a specialty or power, which may use reserved names
 * @returns The problem, as a message for the user
 */
export const traitNameError = (
	name: string,
	constraints: Constraints,
	specialty = false
): string | null => {
	if (!name) return 'Name cannot be empty';
	const max = constraints.trait_max_length;
	if (codePointLength(name) > max) return `Maximum ${max} characters`;
	if (!specialty && constraints.reserved_traits.includes(nameKey(name))) {
		return 'Reserved name; set it in Discord instead';
	}
	if (!new RegExp(constraints.trait_pattern).test(name)) {
		return 'Letters, underscores, apostrophes, and spaces only';
	}
	// In a roll, a word after a trait that reads as Hunger starts the Hunger stack
	const hungerWord = constraints.hunger_word.toLowerCase();
	const aliases = constraints.hunger_aliases.map((alias) => alias.toLowerCase());
	const hunger = name
		.split(' ')
		.slice(1)
		.find((word) => {
			const lower = word.toLowerCase();
			return aliases.includes(lower) || hungerWord.startsWith(lower);
		});
	if (hunger) return `"${hunger}" can't follow the first word, as rolls read it as Hunger`;
	return null;
};

/**
 * Why a macro name is invalid, or null if it's valid. As the bot's `is_macro_name_valid`: letters
 * and underscores only, with at least one letter. Names are unique, ignoring case.
 * @param name - The name, trimmed
 * @param taken - The character's other macros' names
 * @param constraints - The bot's constraints
 * @returns The problem, as a message for the user
 */
export const macroNameError = (
	name: string,
	taken: string[],
	constraints: Constraints
): string | null => {
	if (!name) return 'Name cannot be empty';
	const max = constraints.macro_name_max_length;
	if (name.length > max) return `Name must be ${max} characters or less`;
	if (!new RegExp(constraints.macro_name_pattern).test(name)) {
		return 'Name can only contain letters and underscores, with at least one letter';
	}
	const lower = name.toLowerCase();
	if (taken.some((other) => other.toLowerCase() === lower)) {
		return `There's already a macro named ${name}`;
	}
	return null;
};
