import { expect, test } from 'vitest';

import { characterNameError, nameKey, traitNameError } from '$lib/constraints';
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
