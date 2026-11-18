import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import type { Character } from '$lib/types';
import StainModal from './StainModal.svelte';

const stain = vi.hoisted(() => vi.fn());
vi.mock('$lib/api/characterActions', () => ({ stain }));
// No busy delay: the work's own promise decides when it's done
vi.mock('$lib/state/busy', () => ({ atLeast: <T>(work: Promise<T>): Promise<T> => work }));

beforeEach(() => {
	stain.mockReset().mockResolvedValue({ result: null });
});

/** A character at a Humanity, with Stains. */
const character = (humanity = 7, stains = 0): Character => ({
	_id: 'abc',
	name: 'Nadia',
	guild: '111',
	user: '222',
	splat: 'vampire',
	profile: { description: null, biography: null, images: [] },
	health: '.....',
	willpower: '.....',
	humanity,
	stains,
	traits: []
});

/** Render the modal open, with `open` as state so its closing shows. Returns that state. */
const renderModal = (humanity = 7, stains = 0): { open: boolean } => {
	const bound = $state({ open: true });
	render(StainModal, {
		character: character(humanity, stains),
		get open() {
			return bound.open;
		},
		set open(next: boolean) {
			bound.open = next;
		}
	});
	return bound;
};

/** The Stains the preview shows. */
const stainsShown = (dialog: HTMLElement): number =>
	within(dialog).queryAllByRole('img', { name: /^Stain/ }).length;

test('the preview shows the Stains to add', async () => {
	const user = userEvent.setup();
	renderModal(7, 1);
	const dialog = await screen.findByRole('dialog', { name: 'Apply Stains' });
	expect(stainsShown(dialog)).toBe(2);

	await user.click(within(dialog).getByRole('button', { name: 'More Stains' }));

	expect(stainsShown(dialog)).toBe(3);
});

test('Stains past the empty Humanity boxes warn of degeneration', async () => {
	const user = userEvent.setup();
	renderModal(8, 1); // 2 empty boxes, 1 Stained; adding 1 fills them
	const dialog = await screen.findByRole('dialog');
	expect(within(dialog).queryByText(/Degeneration/)).not.toBeInTheDocument();

	await user.click(within(dialog).getByRole('button', { name: 'More Stains' }));

	expect(
		within(dialog).getByText('Degeneration: 1 Aggravated Willpower damage.')
	).toBeInTheDocument();
});

test('the amount goes up to 10 Stains in all', async () => {
	const user = userEvent.setup();
	renderModal(7, 9);
	const dialog = await screen.findByRole('dialog');

	expect(within(dialog).getByRole('button', { name: 'More Stains' })).toBeDisabled();
	expect(within(dialog).getByRole('button', { name: 'Less Stains' })).toBeDisabled();
	await user.click(within(dialog).getByRole('button', { name: 'Apply' }));
	expect(stain).toHaveBeenCalledWith('abc', { amount: 1 });
});

test('Apply sends the amount, then closes', async () => {
	const user = userEvent.setup();
	const bound = renderModal();
	const dialog = await screen.findByRole('dialog');
	await user.click(within(dialog).getByRole('button', { name: 'More Stains' }));

	await user.click(within(dialog).getByRole('button', { name: 'Apply' }));

	expect(stain).toHaveBeenCalledWith('abc', { amount: 2 });
	await waitFor(() => expect(bound.open).toBe(false));
});

test('while applying, a spinner takes the place of the content, until the modal closes', async () => {
	const user = userEvent.setup();
	let answer: (outcome: unknown) => void = () => {};
	stain.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
	const bound = renderModal();
	const dialog = await screen.findByRole('dialog');

	await user.click(within(dialog).getByRole('button', { name: 'Apply' }));

	expect(within(dialog).getByRole('status')).toHaveTextContent('Applying Stains…');
	expect(within(dialog).queryByRole('button')).not.toBeInTheDocument();
	answer({ result: null });
	await waitFor(() => expect(bound.open).toBe(false));
});

test('a failed Apply says why, and stays open', async () => {
	const user = userEvent.setup();
	stain.mockResolvedValueOnce({ error: "Couldn't reach Inconnu to add Stains." });
	const bound = renderModal();
	const dialog = await screen.findByRole('dialog');

	await user.click(within(dialog).getByRole('button', { name: 'Apply' }));

	expect(await within(dialog).findByRole('alert')).toHaveTextContent(
		"Couldn't reach Inconnu to add Stains."
	);
	expect(bound.open).toBe(true);
	// The content comes back, to try again
	expect(within(dialog).getByRole('button', { name: 'Apply' })).toBeEnabled();
});
