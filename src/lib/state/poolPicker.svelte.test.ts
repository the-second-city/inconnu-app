import { expect, test } from 'vitest';

import { PoolPicker } from './poolPicker.svelte';
import type { Trait } from '$lib/types';

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
		{ trait: 'Brawl', specialty: 'Kindred' },
		{ trait: 'Potence', specialty: null }
	]);

	picker.pick('Brawl', 'Kindred');
	expect(picker.picks).toEqual([{ trait: 'Potence', specialty: null }]);
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
	expect(picker.picks).toEqual([{ trait: 'Strength', specialty: null }]);

	picker.clear();
	expect(picker.picks).toEqual([]);
	expect(picker.open).toBeNull();
});
