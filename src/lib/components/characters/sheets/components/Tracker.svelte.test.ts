import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
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

/**
 * Render a track as the character sheet does, with the character as reactive state so the
 * track's edits are written back to it. Returns that state.
 */
const renderTrack = (health: string, track: 'health' | 'willpower' = 'health', editing = true) => {
	const bound = $state(character(health, '.....'));
	render(Tracker, { character: bound, track, editing });
	return bound;
};

/** Open the track's controls by clicking its boxes. */
const openControls = async (user: ReturnType<typeof userEvent.setup>) => {
	await user.click(screen.getByRole('button', { name: /^(Healthy|Bashing|Lethal|Aggravated)/ }));
};

test('clicking the track explains how to edit, when not editing', async () => {
	const user = userEvent.setup();
	renderTrack('.....', 'health', false);

	await openControls(user);

	expect(await screen.findByText('Click "Edit" above to enable controls.')).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Increase Bashing' })).not.toBeInTheDocument();
});

test('Health has controls for each kind of damage', async () => {
	const user = userEvent.setup();
	renderTrack('.....');

	await openControls(user);

	for (const level of ['Bashing', 'Lethal', 'Aggravated', 'Permanent']) {
		expect(await screen.findByRole('button', { name: `Increase ${level}` })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: `Decrease ${level}` })).toBeInTheDocument();
	}
});

test('Willpower has only temporary and permanent controls', async () => {
	const user = userEvent.setup();
	renderTrack('.....', 'willpower');

	await openControls(user);

	expect(await screen.findByRole('button', { name: 'Increase Temporary' })).toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'Increase Permanent' })).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Increase Lethal' })).not.toBeInTheDocument();
});

test('adding damage updates the track and the character', async () => {
	const user = userEvent.setup();
	const bound = renderTrack('.....');
	await openControls(user);

	await user.click(await screen.findByRole('button', { name: 'Increase Lethal' }));
	await user.click(screen.getByRole('button', { name: 'Increase Bashing' }));

	expect(boxes()).toEqual(['Lethal damage', 'Bashing damage', ...Array(3).fill('Healthy')]);
	expect(bound.health).toBe('.../x');
});

test('damage can be removed only when there is some', async () => {
	const user = userEvent.setup();
	renderTrack('..../');
	await openControls(user);

	expect(await screen.findByRole('button', { name: 'Decrease Lethal' })).toBeDisabled();
	await user.click(screen.getByRole('button', { name: 'Decrease Bashing' }));

	expect(boxes()).toEqual(Array(5).fill('Healthy'));
	expect(screen.getByRole('button', { name: 'Decrease Bashing' })).toBeDisabled();
});

test('a full track takes no more damage', async () => {
	const user = userEvent.setup();
	renderTrack('***');
	await openControls(user);

	expect(await screen.findByRole('button', { name: 'Increase Aggravated' })).toBeDisabled();
	expect(screen.getByRole('button', { name: 'Increase Bashing' })).toBeDisabled();
});

test('permanent controls add and remove boxes', async () => {
	const user = userEvent.setup();
	const bound = renderTrack('.....');
	await openControls(user);

	await user.click(await screen.findByRole('button', { name: 'Increase Permanent' }));
	expect(boxes()).toHaveLength(6);

	await user.click(screen.getByRole('button', { name: 'Decrease Permanent' }));
	await user.click(screen.getByRole('button', { name: 'Decrease Permanent' }));
	expect(boxes()).toHaveLength(4);
	expect(bound.health).toBe('....');
});

test('a track keeps at least one box', async () => {
	const user = userEvent.setup();
	renderTrack('.');
	await openControls(user);

	expect(await screen.findByRole('button', { name: 'Decrease Permanent' })).toBeDisabled();
});
