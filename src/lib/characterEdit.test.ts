import { expect, test } from 'vitest';

import { editBody, saveErrors, type CharacterEdit } from '$lib/characterEdit';
import type { Character, Splat } from '$lib/types';

/** A character of the given splat, with the fields edit mode sends. */
const character = (splat: Splat = 'vampire', fields: Partial<Character> = {}): Character => ({
	_id: 'id',
	name: 'Nadia',
	guild: '111',
	user: '222',
	splat,
	profile: { description: 'Tall.', biography: null, images: ['https://example.com/a.webp'] },
	health: '....//',
	willpower: '...x',
	humanity: 7,
	stains: 1,
	potency: 3,
	hunger: 2,
	convictions: ['  Never   lie ', '', 'Protect the weak'],
	traits: [{ name: 'Potence', rating: 2, type: 'discipline', subtraits: ['Prowess'] }],
	...fields
});

test('the edit body has every editable field', () => {
	expect(editBody(character(), '  Nadia   Petrova ')).toEqual({
		name: 'Nadia Petrova',
		health: '....//',
		willpower: '...x',
		humanity: 7,
		stains: 1,
		potency: 3,
		hunger: 2,
		convictions: ['Never lie', '', 'Protect the weak'],
		profile: { description: 'Tall.', biography: '' },
		traits: [{ name: 'Potence', rating: 2, type: 'discipline', subtraits: ['Prowess'] }]
	});
});

test.each(['mortal', 'ghoul'] as Splat[])('a %s sends no Blood Potency or Hunger', (splat) => {
	const body = editBody(character(splat), 'Nadia');

	expect(body).not.toHaveProperty('potency');
	expect(body).not.toHaveProperty('hunger');
});

test('a thin-blood sends Blood Potency and Hunger', () => {
	const body = editBody(character('thin-blood', { potency: 1, hunger: 0 }), 'Nadia');

	expect(body.potency).toBe(1);
	expect(body.hunger).toBe(0);
});

test('a vampire without Hunger or Blood Potency sends zeros', () => {
	const body = editBody(character('vampire', { potency: undefined, hunger: undefined }), 'Nadia');

	expect(body.potency).toBe(0);
	expect(body.hunger).toBe(0);
});

test("traits send only the bot's fields, and the profile no images", () => {
	const trait = { name: 'Potence', rating: 2, type: 'discipline', subtraits: [], extra: true };
	const body = editBody(character('vampire', { traits: [trait] }), 'Nadia');

	expect(body.traits).toEqual([{ name: 'Potence', rating: 2, type: 'discipline', subtraits: [] }]);
	expect(body.profile).not.toHaveProperty('images');
});

const BODY: CharacterEdit = editBody(character(), 'Nadia');

/** A FastAPI validation error at a location. */
const invalid = (
	loc: (string | number)[],
	msg: string
): { loc: (string | number)[]; msg: string; type: string } => ({ loc, msg, type: 'value_error' });

test('a 422 labels each error by its field, and keeps the name apart', () => {
	const json = {
		detail: [
			invalid(['body', 'name'], "There's already a character named `Nadia`."),
			invalid(['body', 'traits', 0, 'subtraits'], 'Value error, Duplicate specialty: Prowess'),
			invalid(['body', 'traits', 0, 'name'], 'Value error, Duplicate trait: `Potence`.'),
			invalid(['body', 'willpower'], 'Value error, Must have between 3 and 20 boxes.'),
			invalid(['body', 'profile', 'description'], 'String should have at most 1024 characters'),
			invalid(['body'], 'Something about the whole edit')
		]
	};

	expect(saveErrors(422, json, BODY)).toEqual({
		name: "There's already a character named `Nadia`.",
		messages: [
			'Potence specialties: Duplicate specialty: Prowess',
			'Potence: Duplicate trait: `Potence`.',
			'Willpower: Must have between 3 and 20 boxes.',
			'Description: String should have at most 1024 characters',
			'Something about the whole edit'
		]
	});
});

test.each([
	[401, null, 'Your session has ended. Sign in again to save.'],
	[
		403,
		{ detail: 'Only the owner or a Storyteller may edit this character' },
		'You can no longer edit this character.'
	],
	[
		404,
		{ detail: 'Character not found' },
		"This character no longer exists, or you're no longer in its server."
	],
	[503, { detail: 'Bot is still starting up' }, 'Inconnu is starting up. Try again in a moment.'],
	[
		502,
		{ message: "Couldn't reach Inconnu to save your changes." },
		"Couldn't reach Inconnu to save your changes."
	],
	[422, { detail: 'Some other problem' }, 'Some other problem'],
	[500, null, "Couldn't save your changes. Try again."]
])('a %i is one message', (status, json, expected) => {
	expect(saveErrors(status, json, BODY)).toEqual({ name: null, messages: [expected] });
});

test("a 422 with entries that aren't FastAPI's shape still lists them", () => {
	const json = { detail: ['Plain message', { msg: 'No location' }, 42] };

	expect(saveErrors(422, json, BODY)).toEqual({
		name: null,
		messages: ['Plain message', "Some changes weren't valid.", "Some changes weren't valid."]
	});
});
