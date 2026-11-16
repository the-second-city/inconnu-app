import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import type { Character } from '$lib/types';
import SlakeModal from './SlakeModal.svelte';

const slake = vi.hoisted(() => vi.fn());
vi.mock('$lib/characterActions', () => ({ slake }));

beforeEach(() => {
	slake.mockReset().mockResolvedValue({ result: null });
});

/** A vampire at a Hunger. */
const vampire = (hunger = 3): Character => ({
	_id: 'abc',
	name: 'Nadia',
	guild: '111',
	user: '222',
	splat: 'vampire',
	profile: { description: null, biography: null, images: [] },
	health: '.....',
	willpower: '.....',
	humanity: 7,
	stains: 0,
	potency: 1,
	hunger,
	traits: []
});

/** Render the modal open, with `open` as state so its closing shows. Returns that state. */
const renderModal = (hunger = 3): { open: boolean } => {
	const bound = $state({ open: true });
	render(SlakeModal, {
		character: vampire(hunger),
		get open() {
			return bound.open;
		},
		set open(next: boolean) {
			bound.open = next;
		}
	});
	return bound;
};

test('the preview marks the Hunger slaked', async () => {
	const user = userEvent.setup();
	renderModal(3);
	const dialog = await screen.findByRole('dialog', { name: 'Slake Hunger' });
	expect(within(dialog).getByText('Hunger 3 → 2')).toBeInTheDocument();

	await user.click(within(dialog).getByRole('button', { name: 'More Hunger' }));

	expect(within(dialog).getByText('Hunger 3 → 1')).toBeInTheDocument();
	expect(dialog.querySelectorAll('[data-lost]')).toHaveLength(2);
});

test('the amount goes from 1 to the Hunger there is', async () => {
	const user = userEvent.setup();
	renderModal(2);
	const dialog = await screen.findByRole('dialog');
	const more = within(dialog).getByRole('button', { name: 'More Hunger' });

	expect(within(dialog).getByRole('button', { name: 'Less Hunger' })).toBeDisabled();
	await user.click(more);

	expect(more).toBeDisabled();
});

test('Slake sends the amount, then closes', async () => {
	const user = userEvent.setup();
	const bound = renderModal(3);
	const dialog = await screen.findByRole('dialog');
	await user.click(within(dialog).getByRole('button', { name: 'More Hunger' }));

	await user.click(within(dialog).getByRole('button', { name: 'Slake' }));

	expect(slake).toHaveBeenCalledWith('abc', { amount: 2 });
	await waitFor(() => expect(bound.open).toBe(false));
});

test('a failed Slake says why, and stays open', async () => {
	const user = userEvent.setup();
	slake.mockResolvedValueOnce({ error: 'Nadia has no Hunger.' });
	const bound = renderModal(3);
	const dialog = await screen.findByRole('dialog');

	await user.click(within(dialog).getByRole('button', { name: 'Slake' }));

	expect(await within(dialog).findByRole('alert')).toHaveTextContent('Nadia has no Hunger.');
	expect(bound.open).toBe(true);
});
