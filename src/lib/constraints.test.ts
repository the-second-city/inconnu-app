import { expect, test } from 'vitest';

import {
	characterNameError,
	lengthError,
	macroNameError,
	maxCodeUnits,
	nameKey,
	profileLengthErrors,
	tooLongFields,
	traitNameError
} from '$lib/constraints';
import { TEST_CONSTRAINTS } from '$lib/testing/constraints';
import type { Constraints } from '$lib/types';

test.each([
	['Nadia', null],
	["Jean-Luc d'Arcy_II", null],
	['a'.repeat(30), null],
	['', 'Name cannot be empty'],
	['a'.repeat(31), 'Name must be 30 characters or less'],
	// Letters of any script, like the bot's Python \w
	['Ölga', null],
	['José Núñez', null],
	['日本', null],
	[
		'Nadia 😈',
		'Name can only contain letters, numbers, spaces, hyphens, underscores, and apostrophes'
	],
	[
		'Nadia!',
		'Name can only contain letters, numbers, spaces, hyphens, underscores, and apostrophes'
	]
])('characterNameError(%j) is %j', (name: string, expected: string | null) => {
	expect(characterNameError(name, TEST_CONSTRAINTS)).toBe(expected);
});

test('characterNameError follows the served length limit', () => {
	const constraints: Constraints = { ...TEST_CONSTRAINTS, name_max_length: 5 };
	expect(characterNameError('Nadia', constraints)).toBeNull();
	expect(characterNameError('Nadias', constraints)).toBe('Name must be 5 characters or less');
});

test('characterNameError counts code points, as the bot does', () => {
	// U+20000 (CJK Extension B) is a letter outside the BMP: two UTF-16 code units, one code point
	expect('𠀀'.repeat(30)).toHaveLength(60);
	expect(characterNameError('𠀀'.repeat(30), TEST_CONSTRAINTS)).toBeNull();
	expect(characterNameError('𠀀'.repeat(31), TEST_CONSTRAINTS)).toBe(
		'Name must be 30 characters or less'
	);
});

test.each([
	['', 5, null],
	['Hello', 5, null],
	['Hello!', 5, 'Maximum 5 characters'],
	// A single-code-point emoji counts once, as Python's len() counts it, though twice in JS's length
	['🩸🩸🩸🩸🩸', 5, null],
	['🩸🩸🩸🩸🩸🩸', 5, 'Maximum 5 characters']
])('lengthError(%j, %i) is %j', (text: string, max: number, expected: string | null) => {
	expect(lengthError(text, max)).toBe(expected);
});

test('profileLengthErrors checks each field, counting convictions collapsed', () => {
	const constraints: Constraints = {
		...TEST_CONSTRAINTS,
		profile_max_length: 5,
		conviction_max_length: 3
	};
	const errors = profileLengthErrors(
		{ description: 'Too tall', biography: null },
		['a  b', 'abcd', ''],
		constraints
	);

	expect(errors).toEqual({
		description: 'Maximum 5 characters',
		biography: null,
		convictions: [null, 'Maximum 3 characters', null]
	});
	expect(tooLongFields(errors)).toEqual(['Description', 'Conviction 2']);
});

test('tooLongFields names nothing when everything fits', () => {
	const errors = profileLengthErrors(
		{ description: 'Pale.', biography: 'Old.' },
		['Protect the weak'],
		TEST_CONSTRAINTS
	);
	expect(tooLongFields(errors)).toEqual([]);
});

test('maxCodeUnits leaves room for text of only two-unit code points', () => {
	const text = '🩸'.repeat(5);
	expect(text.length).toBe(maxCodeUnits(5));
	expect(lengthError(text, 5)).toBeNull();
});

test.each([
	['Strength', null],
	['Blood_Sorcery', null],
	['Animal Ken', null],
	["Dogs'", null],
	["'Til Dawn", null],
	['a'.repeat(40), null],
	['a'.repeat(41), 'Maximum 40 characters'],
	['', 'Name cannot be empty'],
	['Brawl2', 'Letters, underscores, apostrophes, and spaces only'],
	['Ölfaktorisch', 'Letters, underscores, apostrophes, and spaces only'],
	["Brawl '", 'Letters, underscores, apostrophes, and spaces only'],
	['Willpower', 'Reserved name; set it in Discord instead'],
	['POWER_BONUS', 'Reserved name; set it in Discord instead'],
	// Reserved names compare without case or spaces, as the bot's name keys
	['Power Bonus', 'Reserved name; set it in Discord instead'],
	['current_hunger', 'Reserved name; set it in Discord instead'],
	// Words after the first can't read as Hunger in a roll
	['Hunger Games', null],
	['Blood Hunger', `"Hunger" can't follow the first word, as rolls read it as Hunger`],
	['Feral H', `"H" can't follow the first word, as rolls read it as Hunger`],
	[
		'Feral current_hunger',
		`"current_hunger" can't follow the first word, as rolls read it as Hunger`
	],
	['Feral Hungers', null]
])('traitNameError(%j) is %j', (name: string, expected: string | null) => {
	expect(traitNameError(name, TEST_CONSTRAINTS)).toBe(expected);
});

test('specialties may have reserved names, but not Hunger words', () => {
	expect(traitNameError('Willpower', TEST_CONSTRAINTS, true)).toBeNull();
	expect(traitNameError('Big Hun', TEST_CONSTRAINTS, true)).toBe(
		`"Hun" can't follow the first word, as rolls read it as Hunger`
	);
});

test('nameKey drops case and spaces', () => {
	expect(nameKey('Animal Ken')).toBe('animalken');
	expect(nameKey('AnimalKen')).toBe('animalken');
});

/** The macro name pattern's error. */
const LETTERS = 'Name can only contain letters and underscores, with at least one letter';

test.each<[string, string | null]>([
	['feed', null],
	['Blood_Surge', null],
	['_hunt_', null],
	['', 'Name cannot be empty'],
	['a'.repeat(51), 'Name must be 50 characters or less'],
	['two words', LETTERS],
	['rouse2', LETTERS],
	['Ébène', LETTERS],
	['___', LETTERS]
])('macro name %j: %s', (name, error) => {
	expect(macroNameError(name, [], TEST_CONSTRAINTS)).toBe(error);
});

test('a macro name already taken, ignoring case, is invalid', () => {
	expect(macroNameError('FEED', ['feed', 'hunt'], TEST_CONSTRAINTS)).toBe(
		"There's already a macro named FEED"
	);
	expect(macroNameError('feeding', ['feed'], TEST_CONSTRAINTS)).toBeNull();
});
