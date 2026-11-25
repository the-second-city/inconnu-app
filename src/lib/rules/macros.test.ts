import { expect, test } from 'vitest';

import { diceLabel, macrosUsing, missingLabel, parsePool, resolvePool } from './macros';
import type { Character, Macro, Splat, Trait } from '$lib/types';

/** A trait with a rating and any specialties (or powers). */
const trait = (name: string, rating: number, type = 'skill', subtraits: string[] = []): Trait => ({
	name,
	rating,
	type,
	subtraits
});

/** A character with these traits: Blood Potency 3, Hunger 2, 4 of 5 Willpower undamaged. */
const character = (traits: Trait[], splat: Splat = 'vampire'): Character => ({
	_id: 'abc',
	name: 'Nadia',
	guild: '111',
	user: '222',
	splat,
	profile: { description: null, biography: null, images: [] },
	health: '......',
	willpower: '..../',
	humanity: 7,
	stains: 0,
	potency: 3,
	hunger: 2,
	traits
});

const TRAITS = [
	trait('Strength', 4, 'attribute'),
	trait('Brawl', 3, 'skill', ['Kindred', 'Grappling']),
	trait('Animal Ken', 2),
	trait('Potence', 2, 'discipline', ['Lethal Body']),
	trait('Obvious Predator', 2, 'custom')
];

test('adds the terms, with each specialty adding a die', () => {
	const pool = resolvePool(['Strength', '+', 'Brawl.Kindred'], character(TRAITS));
	expect(pool.dice).toBe(4 + 3 + 1);
	expect(pool.terms.map((t) => [t.sign, t.name, t.specialties])).toEqual([
		['+', 'Strength', []],
		['+', 'Brawl', ['Kindred']]
	]);
});

test('two specialties add two dice', () => {
	expect(resolvePool(['Brawl.Kindred.Grappling'], character(TRAITS)).dice).toBe(5);
});

test("a Discipline's powers add no dice", () => {
	expect(resolvePool(['Strength', '+', 'Potence.Lethal Body'], character(TRAITS)).dice).toBe(6);
});

test('subtracts terms and numbers, never going below 1', () => {
	const pool = character(TRAITS);
	expect(resolvePool(['Strength', '-', 'Obvious Predator', '+', '1'], pool).dice).toBe(3);
	expect(resolvePool(['Animal Ken', '-', '5'], pool).dice).toBe(1);
	expect(resolvePool(['Strength', '-', 'Strength'], pool).dice).toBe(1);
	expect(resolvePool(['Strength', '-', '2'], pool).terms[1]).toMatchObject({
		sign: '-',
		kind: 'number',
		dice: 2
	});
});

test('matches names as the character has them now, ignoring case and spaces', () => {
	const pool = resolvePool(['animalken', '+', 'BRAWL.kindred'], character(TRAITS));
	expect(pool.dice).toBe(2 + 4);
	expect(pool.terms.map((t) => [t.name, t.specialties])).toEqual([
		['Animal Ken', []],
		['Brawl', ['Kindred']]
	]);
});

test.each<[string, number]>([
	['Willpower', 4], // Undamaged boxes
	['Humanity', 7],
	['Hunger', 2],
	['Potency', 3],
	['Surge', 3], // Half Blood Potency, rounded up, plus 1
	['Bane', 3]
])("a vampire's inherent %s rolls %i dice", (name, dice) => {
	expect(resolvePool([name], character([])).dice).toBe(dice);
});

test("a mortal has Willpower and Humanity, but not a vampire's traits", () => {
	const mortal = character([], 'mortal');
	expect(resolvePool(['Willpower', '+', 'Humanity'], mortal).dice).toBe(11);
	expect(resolvePool(['Surge'], mortal)).toMatchObject({
		dice: null,
		terms: [{ missing: 'Surge' }]
	});
});

test('a trait or specialty the character lost leaves the pool without a total', () => {
	const chars = character(TRAITS);
	expect(resolvePool(['Strength', '+', 'Melee'], chars)).toMatchObject({
		dice: null,
		terms: [
			{ dice: 4, missing: null },
			{ name: 'Melee', dice: null, missing: 'Melee' }
		]
	});
	expect(resolvePool(['Brawl.Firearms'], chars)).toMatchObject({
		dice: null,
		terms: [{ name: 'Brawl', specialties: ['Firearms'], missing: 'Firearms' }]
	});
});

test('an empty pool (a Rouse-only macro) has no terms and no dice', () => {
	expect(resolvePool([], character(TRAITS))).toEqual({ terms: [], dice: 0 });
});

/** A macro rolling this pool. */
const macro = (name: string, pool: string[]): Macro => ({
	name,
	pool,
	hunger: true,
	difficulty: 0,
	rouses: 0,
	reroll_rouses: false,
	staining: 'show',
	hunt: false,
	comment: null
});

test('finds the macros rolling a trait, with or without a specialty, as the bot names it', () => {
	const hunt = macro('hunt', ['Manipulation', '+', 'Occult.Bahari', '-', 'ObviousPredator']);
	const brawl = macro('brawl', ['Strength', '+', 'Brawl']);
	const occult = macro('occult', ['Intelligence', '+', 'occult']);

	expect(macrosUsing([hunt, brawl, occult], 'Obvious Predator')).toEqual([hunt]);
	expect(macrosUsing([hunt, brawl, occult], 'Occult')).toEqual([hunt, occult]);
	expect(macrosUsing([hunt, brawl, occult], 'Potence')).toEqual([]);
});

test('parses a pool into its terms, each with its sign', () => {
	expect(parsePool(['Strength', '+', 'Brawl.Kindred', '-', '2'])).toEqual([
		{ sign: '+', token: 'Strength' },
		{ sign: '+', token: 'Brawl.Kindred' },
		{ sign: '-', token: '2' }
	]);
	expect(parsePool([])).toEqual([]);
});

test('names what a term lacks: the trait, or the trait and its specialty', () => {
	const [gone, lost, fine] = resolvePool(
		['Melee', '+', 'Brawl.Boxing', '+', 'Strength'],
		character(TRAITS)
	).terms;

	expect(missingLabel(gone)).toBe('Melee');
	expect(missingLabel(lost)).toBe('Brawl (Boxing)');
	expect(missingLabel(fine)).toBeNull();
});

test.each([
	[1, '1 die'],
	[5, '5 dice'],
	[null, '? dice']
])('%s dice read as %j', (dice, label) => {
	expect(diceLabel(dice)).toBe(label);
});
