import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';

import MacroCard from './MacroCard.svelte';
import type { Character, Macro } from '$lib/types';

/** A vampire with Strength 4 and Brawl 3 (Kindred). */
const CHARACTER: Character = {
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
	potency: 1,
	hunger: 1,
	traits: [
		{ name: 'Strength', rating: 4, type: 'attribute', subtraits: [] },
		{ name: 'Brawl', rating: 3, type: 'skill', subtraits: ['Kindred'] }
	]
};

/** A plain macro (Hunger on, no Difficulty, no Rouses), with these changes. */
const macro = (fields: Partial<Macro> = {}): Macro => ({
	name: 'punch',
	pool: ['Strength', '+', 'Brawl.Kindred'],
	hunger: true,
	difficulty: 0,
	rouses: 0,
	reroll_rouses: false,
	staining: 'show',
	hunt: false,
	comment: null,
	...fields
});

/** Render a macro card for the test character. */
const renderCard = (fields: Partial<Macro> = {}) =>
	render(MacroCard, { macro: macro(fields), character: CHARACTER });

test('shows the name, the pool, and its dice', () => {
	renderCard();
	const card = screen.getByRole('article', { name: 'punch' });
	expect(card).toHaveTextContent('punch');
	expect(card).toHaveTextContent('Strength + Brawl (Kindred)');
	expect(card).toHaveTextContent('8 dice');
});

test('a plain macro lists no details', () => {
	renderCard();
	expect(screen.queryByRole('list')).not.toBeInTheDocument();
});

test('lists only what differs from a plain roll', () => {
	renderCard({
		difficulty: 3,
		rouses: 2,
		reroll_rouses: true,
		staining: 'apply',
		hunger: false,
		hunt: true
	});
	const details = screen.getAllByRole('listitem').map((item) => item.textContent?.trim());
	expect(details).toEqual([
		'Difficulty 3',
		'2 Rouse Checks, re-rolled, Stains',
		'No Hunger',
		'Hunt'
	]);
});

test('a Rouse-only macro shows no pool or dice', () => {
	renderCard({ pool: [], rouses: 1 });
	expect(screen.getByRole('article')).not.toHaveTextContent('dice');
	expect(screen.getByRole('listitem')).toHaveTextContent('1 Rouse Check');
});

test('names the traits the sheet no longer has, without a total', () => {
	renderCard({ pool: ['Strength', '+', 'Melee'] });
	const card = screen.getByRole('article');
	expect(card).toHaveTextContent('Not on the sheet: Melee');
	expect(card).toHaveTextContent('? dice');
});

test('shows the comment', () => {
	renderCard({ comment: 'Right in the jaw.' });
	expect(screen.getByText('Right in the jaw.')).toBeInTheDocument();
});
