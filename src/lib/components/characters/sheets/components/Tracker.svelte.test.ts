import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';

import type { Character } from '$lib/types';
import Tracker from './Tracker.svelte';

/** A character with the given Health and Willpower tracks. */
const character = (health: string, willpower = '.....'): Character => ({
	_id: 'id',
	name: 'Nadia',
	guild: '111',
	user: '222',
	splat: 'vampire',
	profile: { description: null, biography: null, images: [] },
	health,
	willpower,
	humanity: 7,
	stains: 0,
	traits: []
});

/** The track's boxes, in order, by their labels. */
const boxes = (): (string | null)[] =>
	screen.getAllByRole('img').map((box) => box.getAttribute('aria-label'));

test.each([
	['health', 'Health'],
	['willpower', 'Willpower']
] as const)('labels the %s track', (track, label) => {
	render(Tracker, { character: character('...'), track, editing: false });

	expect(document.body).toHaveTextContent(label);
});

test('an undamaged track is all healthy', () => {
	render(Tracker, { character: character('......'), track: 'health', editing: false });

	expect(boxes()).toEqual(Array(6).fill('Healthy'));
});

test('shows damage leftmost, worst first', () => {
	render(Tracker, { character: character('...../x*'), track: 'health', editing: false });

	expect(boxes()).toEqual([
		'Aggravated damage',
		'Lethal damage',
		'Bashing damage',
		...Array(5).fill('Healthy')
	]);
});

test('shows the chosen track', () => {
	render(Tracker, { character: character('......', '...//'), track: 'willpower', editing: false });

	expect(boxes()).toEqual(['Bashing damage', 'Bashing damage', 'Healthy', 'Healthy', 'Healthy']);
});
