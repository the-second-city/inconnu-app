import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { expect, test } from 'vitest';

import type { Character } from '$lib/types';
import HumanityBlock from './HumanityBlock.svelte';

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

test("shows the character's Humanity, read-only", () => {
	render(HumanityBlock, { character: character(7, 2) });

	const labels = screen.getAllByRole('img').map((box) => box.getAttribute('aria-label'));
	expect(labels.filter((label) => label === 'Humanity')).toHaveLength(7);
	expect(labels.filter((label) => label === 'Stain')).toHaveLength(2);
	expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('shows what goes under the track', () => {
	render(HumanityBlock, {
		character: character(7, 0),
		children: createRawSnippet(() => ({ render: () => '<p>No Oblivion Stains.</p>' }))
	});

	expect(screen.getByText('No Oblivion Stains.')).toBeInTheDocument();
});
