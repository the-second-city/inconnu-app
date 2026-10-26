import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';

import type { Character, Splat } from '$lib/types';
import BloodTrackers from './BloodTrackers.svelte';

/** A vampire with the given blood fields. */
const vampire = (fields: Partial<Character> = {}, splat: Splat = 'vampire'): Character => ({
	_id: 'id',
	name: 'Nadia',
	guild: '111',
	user: '222',
	splat,
	profile: { description: null, biography: null, images: [] },
	health: '......',
	willpower: '.....',
	humanity: 7,
	stains: 0,
	traits: [],
	...fields
});

/** The rendered Blood Potency dots. */
const potencyDots = (): Element[] =>
	Array.from(screen.getByRole('img', { name: /^Blood Potency/ }).children);

test.each([
	['vampire', 10],
	['thin-blood', 2]
] as [Splat, number][])('a %s has %i Blood Potency dots', (splat, dots) => {
	render(BloodTrackers, { character: vampire({ blood_potency: 1 }, splat) });

	expect(potencyDots()).toHaveLength(dots);
});

test('shows Blood Potency', () => {
	render(BloodTrackers, { character: vampire({ blood_potency: 3 }) });

	expect(screen.getByRole('img', { name: 'Blood Potency 3' })).toBeInTheDocument();
});

test('prefers potency over blood_potency', () => {
	render(BloodTrackers, { character: vampire({ potency: 4, blood_potency: 2 }) });

	expect(screen.getByRole('img', { name: 'Blood Potency 4' })).toBeInTheDocument();
});

test('Blood Potency defaults to 0', () => {
	render(BloodTrackers, { character: vampire() });

	expect(screen.getByRole('img', { name: 'Blood Potency 0' })).toBeInTheDocument();
});

test.each([0, 2, 5])('shows %i Hunger of 5', (hunger) => {
	render(BloodTrackers, { character: vampire({ hunger }) });

	expect(screen.queryAllByRole('img', { name: 'Hunger' })).toHaveLength(hunger);
	expect(screen.queryAllByRole('img', { name: 'No hunger' })).toHaveLength(5 - hunger);
});
