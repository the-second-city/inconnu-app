import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';

import type { Splat, Trait } from '$lib/types';
import TraitSheet from './TraitSheet.svelte';

/** A trait without specialties. */
const trait = (name: string, type: string): Trait => ({ name, rating: 1, type, subtraits: [] });

const BASICS = [trait('Strength', 'attribute'), trait('Athletics', 'skill')];

/**
 * Render a sheet for a `splat` with the given traits. The traits are reactive state, as the wizard
 * passes them, since the sheet binds each one down to its rating.
 */
const renderSheet = (traits: Trait[], splat: Splat = 'vampire', editing = false) => {
	const bound = $state({ traits });
	return render(TraitSheet, { traits: bound.traits, splat, editing });
};

/** Whether a section or column heading is showing. */
const hasHeading = (name: string): boolean => screen.queryByRole('heading', { name }) !== null;

test('always shows attributes and skills', () => {
	renderSheet([]);

	expect(hasHeading('Attributes')).toBe(true);
	expect(hasHeading('Skills')).toBe(true);
	expect(screen.getAllByRole('heading', { name: 'physical' })).toHaveLength(2);
	expect(screen.getAllByRole('heading', { name: 'social' })).toHaveLength(2);
	expect(screen.getAllByRole('heading', { name: 'mental' })).toHaveLength(2);
});

test('hides advantages when there are none', () => {
	renderSheet(BASICS);

	expect(hasHeading('Advantages')).toBe(false);
});

test.each([
	['disciplines', trait('Potence', 'discipline')],
	['custom traits', trait('Status', 'custom')]
])('shows advantages for %s', (_case, advantage) => {
	renderSheet([...BASICS, advantage]);

	expect(hasHeading('Advantages')).toBe(true);
	expect(hasHeading('Disciplines')).toBe(true);
	expect(hasHeading('Custom Traits')).toBe(true);
});

test('shows advantages while editing, even when there are none', () => {
	renderSheet(BASICS, 'vampire', true);

	expect(hasHeading('Advantages')).toBe(true);
});

test.each(['ghoul', 'thin-blood', 'vampire'] as Splat[])('a %s has disciplines', (splat) => {
	renderSheet(BASICS, splat, true);

	expect(hasHeading('Disciplines')).toBe(true);
});

test('mortals have no disciplines', () => {
	renderSheet(BASICS, 'mortal', true);

	expect(hasHeading('Disciplines')).toBe(false);
	expect(hasHeading('Custom Traits')).toBe(true);
});
