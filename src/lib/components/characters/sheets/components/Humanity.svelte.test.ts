import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
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

/**
 * Render Humanity as the character sheet does, with the character as reactive state so edits
 * are written back to it. Returns that state.
 */
const renderHumanity = (humanity: number, stains: number, editing = true) => {
	const bound = $state(character(humanity, stains));
	render(Humanity, { character: bound, editing });
	return bound;
};

/** Open the Humanity controls by clicking the boxes. */
const openControls = async (user: ReturnType<typeof userEvent.setup>) => {
	await user.click(screen.getByRole('button', { name: /^(Humanity|Empty|Degeneration|Stain)/ }));
};

test('clicking the boxes explains how to edit, when not editing', async () => {
	const user = userEvent.setup();
	renderHumanity(7, 0, false);

	await openControls(user);

	expect(await screen.findByText('Click "Edit" above to enable controls.')).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Increase Humanity' })).not.toBeInTheDocument();
});

test('changes Humanity and Stains', async () => {
	const user = userEvent.setup();
	const bound = renderHumanity(7, 0);
	await openControls(user);

	await user.click(await screen.findByRole('button', { name: 'Decrease Humanity' }));
	await user.click(screen.getByRole('button', { name: 'Increase Stains' }));
	await user.click(screen.getByRole('button', { name: 'Increase Stains' }));

	expect(bound).toMatchObject({ humanity: 6, stains: 2 });
	expect(boxes()).toEqual([...times(6, 'Humanity'), ...times(2, 'Empty'), ...times(2, 'Stain')]);
});

test.each([
	['Increase Humanity', 10, 0],
	['Decrease Stains', 7, 0],
	['Increase Stains', 7, 10]
])('%s is disabled at its limit', async (name, humanity, stains) => {
	const user = userEvent.setup();
	renderHumanity(humanity, stains);

	await openControls(user);

	expect(await screen.findByRole('button', { name })).toBeDisabled();
});
