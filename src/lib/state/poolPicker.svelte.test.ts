import { expect, test } from 'vitest';

import { PoolPicker } from './poolPicker.svelte';
import type { Character, Trait } from '$lib/types';

/** A trait of the type, rated 2. */
const trait = (name: string, type: string): Trait => ({ name, rating: 2, type, subtraits: [] });

const TRAITS = [
	trait('Strength', 'attribute'),
	trait('Brawl', 'skill'),
	trait('Potence', 'discipline')
];

test('picking adds a trait, with or without a specialty', () => {
	const picker = new PoolPicker();

	picker.pick('Brawl', 'Kindred');
	picker.pick('Strength', null);

	expect(picker.selection('Brawl')).toBe('Kindred');
	expect(picker.selection('Strength')).toBeNull();
	expect(picker.selection('Potence')).toBeUndefined();
});

test('picking it again the same way drops it; another way switches it in place', () => {
	const picker = new PoolPicker();
	picker.pick('Brawl', null);
	picker.pick('Potence', null);

	picker.pick('Brawl', 'Kindred');
	expect(picker.picks).toEqual([
		{ trait: 'Brawl', specialty: 'Kindred', negative: false },
		{ trait: 'Potence', specialty: null, negative: false }
	]);

	picker.pick('Brawl', 'Kindred');
	expect(picker.picks).toEqual([{ trait: 'Potence', specialty: null, negative: false }]);
});

test('the tokens put attributes first, then the order picked, joined by +', () => {
	const picker = new PoolPicker();
	picker.pick('Potence', 'Lethal Body');
	picker.pick('Brawl', 'Kindred');
	picker.pick('Strength', null);

	expect(picker.tokens(TRAITS)).toEqual([
		'Strength',
		'+',
		'Potence.Lethal Body',
		'+',
		'Brawl.Kindred'
	]);
});

test('no picks, no tokens', () => {
	expect(new PoolPicker().tokens(TRAITS)).toEqual([]);
});

test('remove and clear drop picks; clear closes the menu too', () => {
	const picker = new PoolPicker();
	picker.pick('Brawl', null);
	picker.pick('Strength', null);
	picker.open = 'Brawl';

	picker.remove('Brawl');
	expect(picker.picks).toEqual([{ trait: 'Strength', specialty: null, negative: false }]);

	picker.clear();
	expect(picker.picks).toEqual([]);
	expect(picker.open).toBeNull();
});

test('a flipped trait is subtracted, after everything added', () => {
	const picker = new PoolPicker();
	picker.pick('Brawl', null);
	picker.pick('Potence', null);
	picker.pick('Strength', null);

	picker.flip('Brawl');

	expect(picker.isNegative('Brawl')).toBe(true);
	expect(picker.tokens(TRAITS)).toEqual(['Strength', '+', 'Potence', '-', 'Brawl']);

	picker.flip('Brawl');
	expect(picker.tokens(TRAITS)).toEqual(['Strength', '+', 'Brawl', '+', 'Potence']);
});

test("the last trait added can't be subtracted", () => {
	const picker = new PoolPicker();
	picker.pick('Brawl', null);
	expect(picker.canFlip('Brawl')).toBe(false);

	picker.flip('Brawl');
	expect(picker.isNegative('Brawl')).toBe(false);

	picker.pick('Strength', null);
	picker.flip('Brawl');
	expect(picker.canFlip('Strength')).toBe(false);
	expect(picker.canFlip('Brawl')).toBe(true); // Back to added is always fine
});

test('switching specialty keeps the sign', () => {
	const picker = new PoolPicker();
	picker.pick('Strength', null);
	picker.pick('Brawl', null);
	picker.flip('Brawl');

	picker.pick('Brawl', 'Kindred');

	expect(picker.isNegative('Brawl')).toBe(true);
	expect(picker.selection('Brawl')).toBe('Kindred');
});

/** A vampire with these traits (and Willpower, Hunger, and the rest, which aren't on the sheet). */
const character = (traits: Trait[]): Character => ({
	_id: 'abc',
	name: 'Nadia',
	guild: '111',
	user: '222',
	splat: 'vampire',
	profile: { description: null, biography: null, images: [] },
	health: '......',
	willpower: '.....',
	humanity: 7,
	stains: 0,
	potency: 3,
	hunger: 2,
	traits
});

test("loading a pool picks its traits by the sheet's names, with their specialties and signs", () => {
	const picker = new PoolPicker();
	const traits = [
		trait('Strength', 'attribute'),
		{ ...trait('Brawl', 'skill'), subtraits: ['Kindred'] },
		trait('Obvious Predator', 'custom')
	];
	picker.pick('Potence', null);
	picker.open = 'Brawl';
	const added = picker.added;

	picker.load(['strength', '+', 'brawl.kindred', '-', 'ObviousPredator'], character(traits));

	expect(picker.picks).toEqual([
		{ trait: 'Strength', specialty: null, negative: false },
		{ trait: 'Brawl', specialty: 'Kindred', negative: false },
		{ trait: 'Obvious Predator', specialty: null, negative: true }
	]);
	expect(picker.open).toBeNull();
	expect(picker.added).toBe(added); // Loading isn't picking
	expect(picker.tokens(traits)).toEqual([
		'Strength',
		'+',
		'Brawl.Kindred',
		'-',
		'Obvious Predator'
	]);
});

test("what the sheet can't pick loads too: inherent traits, lost traits, numbers combined", () => {
	const picker = new PoolPicker();
	const traits = [trait('Strength', 'attribute')];

	picker.load(
		['Willpower', '+', '2', '+', 'Gone.Thing.Other', '+', 'Strength', '-', '3'],
		character(traits)
	);

	expect(picker.picks).toEqual([
		{ trait: 'Willpower', specialty: null, negative: false },
		{ trait: 'Gone', specialty: 'Thing.Other', negative: false },
		{ trait: 'Strength', specialty: null, negative: false },
		{ trait: '1', specialty: null, negative: true }
	]);
	expect(picker.tokens(traits)).toEqual([
		'Strength',
		'+',
		'Willpower',
		'+',
		'Gone.Thing.Other',
		'-',
		'1'
	]);
});

test('a trait in a pool twice loads once', () => {
	const picker = new PoolPicker();

	picker.load(['Strength', '+', 'Strength'], character([trait('Strength', 'attribute')]));

	expect(picker.picks).toHaveLength(1);
});

test('picking a new trait counts as added; switching or dropping one does not', () => {
	const picker = new PoolPicker();
	picker.pick('Brawl', null);
	picker.pick('Brawl', 'Kindred');
	picker.pick('Brawl', 'Kindred');

	expect(picker.added).toBe(1);
});

test("showing a macro highlights its traits by the sheet's names, apart from the picks", () => {
	const picker = new PoolPicker();
	picker.pick('Strength', null);

	picker.show(['strength', '-', 'brawl'], character(TRAITS));

	expect(picker.highlighted('Strength')).toEqual({
		trait: 'Strength',
		specialty: null,
		negative: false
	});
	expect(picker.highlighted('Brawl')?.negative).toBe(true);
	expect(picker.highlighted('Potence')).toBeUndefined();
	expect(picker.picks).toHaveLength(1);

	picker.hide();
	expect(picker.highlighted('Strength')).toBeUndefined();
});
