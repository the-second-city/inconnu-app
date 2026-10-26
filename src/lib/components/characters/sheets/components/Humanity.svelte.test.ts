import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';

import type { Character } from '$lib/types';
import Humanity from './Humanity.svelte';

/** A character with the given Humanity and Stains. */
const character = (humanity: number, stains: number): Character => ({
	_id: 'id',
	name: 'Nadia',
	guild: '111',
	user: '222',
	splat: 'vampire',
	profile: { description: null, biography: null, images: [] },
	health: '......',
	willpower: '.....',
	humanity,
	stains,
	traits: []
});

/** The Humanity boxes, in order, by their labels. */
const boxes = (): (string | null)[] =>
	screen.getAllByRole('img').map((box) => box.getAttribute('aria-label'));

/** `count` copies of `label`. */
const times = (count: number, label: string): string[] => Array(count).fill(label);

test('shows Humanity, then empty boxes', () => {
	render(Humanity, { character: character(7, 0), editing: false });

	expect(boxes()).toEqual([...times(7, 'Humanity'), ...times(3, 'Empty')]);
});

test('Stains fill empty boxes from the right', () => {
	render(Humanity, { character: character(7, 2), editing: false });

	expect(boxes()).toEqual([...times(7, 'Humanity'), 'Empty', ...times(2, 'Stain')]);
});

test('Stains beyond the empty boxes overlap Humanity as degeneration', () => {
	render(Humanity, { character: character(8, 4), editing: false });

	expect(boxes()).toEqual([
		...times(6, 'Humanity'),
		...times(2, 'Degeneration'),
		...times(2, 'Stain')
	]);
});

test('always shows 10 boxes', () => {
	render(Humanity, { character: character(10, 3), editing: false });

	expect(boxes()).toHaveLength(10);
});
