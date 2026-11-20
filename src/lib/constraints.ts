/**
 * The bot's validation constraints (`Constraints`, from its `GET /constraints`), and the checks
 * built on them, so edit mode and the wizard accept what the bot accepts without copies of its
 * limits. The page that edits (the character page, the wizard) provides them by context.
 */

import { getContext, setContext } from 'svelte';

import type { Constraints } from '$lib/types';

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
	if (name.length > max) return `Name must be ${max} characters or less`;
	if (!new RegExp(constraints.name_pattern, 'u').test(name)) {
		return 'Name can only contain letters, numbers, spaces, hyphens, underscores, and apostrophes';
	}
	return null;
};

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
	if (name.length > max) return `Maximum ${max} characters`;
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
