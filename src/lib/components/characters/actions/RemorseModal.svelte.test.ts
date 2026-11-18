import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import type { Character, Splat } from '$lib/types';
import RemorseModal from './RemorseModal.svelte';

const remorse = vi.hoisted(() => vi.fn());
vi.mock('$lib/api/characterActions', () => ({ remorse }));

beforeEach(() => {
	remorse
		.mockReset()
		.mockResolvedValue({ result: { remorseful: true, dice: [3, 8], humanity: 7 } });
});

/** A character at Humanity 7, with Stains, of a splat and Blood Potency. */
const character = (stains = 1, splat: Splat = 'vampire', potency = 3): Character => ({
	_id: 'abc',
	name: 'Nadia',
	guild: '111',
	user: '222',
	splat,
	profile: { description: null, biography: null, images: [] },
	health: '......',
	willpower: '.....',
	humanity: 7,
	stains,
	potency,
	hunger: 2,
	traits: []
});

/** Render the modal open, with `open` as state so its closing shows. Returns that state. */
const renderModal = (char: Character = character()): { open: boolean } => {
	const bound = $state({ open: true });
	render(RemorseModal, {
		character: char,
		stepDelay: 0,
		revealDelay: 0,
		get open() {
			return bound.open;
		},
		set open(next: boolean) {
			bound.open = next;
		}
	});
	return bound;
};

/** The open modal, before rolling. */
const modal = (): Promise<HTMLElement> => screen.findByRole('dialog', { name: 'Remorse Test' });

test('the options say how many dice to roll, and what failing costs', async () => {
	renderModal(character(1));
	const dialog = await modal();

	// Humanity 7 with 1 Stain leaves 2 boxes empty
	expect(within(dialog).getByText(/^Roll 2 dice\./)).toHaveTextContent(
		'Roll 2 dice. Any 6 or higher keeps Humanity at 7; otherwise it drops to 6. Either way, the Stains clear.'
	);
});

test("the Lasombra alternative Bane rolls Bane Severity fewer dice, and it's sent", async () => {
	const user = userEvent.setup();
	renderModal(character(1, 'vampire', 1)); // Bane Severity 2
	const dialog = await modal();

	await user.click(within(dialog).getByRole('checkbox', { name: /Lasombra alternative Bane/ }));

	// 2 dice, less 2, but at least one
	expect(within(dialog).getByText(/^Roll 1 die\./)).toBeInTheDocument();
	await user.click(within(dialog).getByRole('button', { name: 'Roll' }));
	expect(remorse).toHaveBeenCalledWith('abc', { min_override: 1, lasombra_alt: true });
});

test.each<[Splat, number]>([
	['mortal', 0],
	['ghoul', 0],
	['thin-blood', 1]
])("a %s has no clan Bane, so there's no Lasombra option", async (splat, potency) => {
	renderModal(character(1, splat, potency));
	const dialog = await modal();

	expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument();
});

test('rolling sends the test, then shows a success, with its dice', async () => {
	const user = userEvent.setup();
	renderModal();
	await user.click(within(await modal()).getByRole('button', { name: 'Roll' }));

	expect(remorse).toHaveBeenCalledWith('abc', { min_override: 1, lasombra_alt: false });
	const dialog = await screen.findByRole('dialog', { name: 'Remorse Success' });
	expect(within(dialog).getByRole('img', { name: 'Dice: 3, 8' })).toBeInTheDocument();
	expect(within(dialog).getByRole('status')).toHaveTextContent('Humanity remains at 7.');
});

test('a failure says how much Humanity dropped', async () => {
	const user = userEvent.setup();
	remorse.mockResolvedValueOnce({ result: { remorseful: false, dice: [2, 4], humanity: 6 } });
	renderModal();
	await user.click(within(await modal()).getByRole('button', { name: 'Roll' }));

	const dialog = await screen.findByRole('dialog', { name: 'Remorse Failure' });
	expect(within(dialog).getByRole('status')).toHaveTextContent('Humanity drops from 7 to 6.');
});

test('Done closes the result', async () => {
	const user = userEvent.setup();
	const bound = renderModal();
	await user.click(within(await modal()).getByRole('button', { name: 'Roll' }));

	const dialog = await screen.findByRole('dialog', { name: 'Remorse Success' });
	await user.click(within(dialog).getByRole('button', { name: 'Done' }));

	await waitFor(() => expect(bound.open).toBe(false));
});

test('a failed test says why, back at the options', async () => {
	const user = userEvent.setup();
	remorse.mockResolvedValueOnce({ error: 'Nadia has no Stains.' });
	renderModal();
	await user.click(within(await modal()).getByRole('button', { name: 'Roll' }));

	const dialog = await modal();
	expect(await within(dialog).findByRole('alert')).toHaveTextContent('Nadia has no Stains.');
	expect(within(dialog).getByRole('button', { name: 'Roll' })).toBeInTheDocument();
});

test('without Stains, there is nothing to roll', async () => {
	renderModal(character(0));

	expect(within(await modal()).getByRole('button', { name: 'Roll' })).toBeDisabled();
});

test('the dice to roll show as blank faces, with any the Lasombra Bane removes crossed out', async () => {
	const user = userEvent.setup();
	renderModal({ ...character(1, 'vampire', 1), humanity: 4 }); // 5 dice; Bane Severity 2
	const dialog = await modal();

	expect(within(dialog).getByRole('img', { name: '5 dice' })).toBeInTheDocument();
	await user.click(within(dialog).getByRole('checkbox', { name: 'Lasombra alternative Bane' }));

	expect(
		within(dialog).getByRole('img', { name: '3 dice, 2 removed by the Lasombra Bane' })
	).toBeInTheDocument();
});

test('rolling locks the options and buttons until the outcome paints in, in the same view', async () => {
	const user = userEvent.setup();
	let answer: (outcome: unknown) => void = () => {};
	remorse.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
	renderModal(character(1, 'vampire', 1));
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Roll' }));

	expect(within(dialog).getByRole('button', { name: 'Roll' })).toBeDisabled();
	expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
	expect(
		within(dialog).getByRole('checkbox', { name: 'Lasombra alternative Bane' })
	).toBeDisabled();
	expect(within(dialog).getByRole('img', { name: 'Rolling 2 dice' })).toBeInTheDocument();

	answer({ result: { remorseful: false, dice: [2, 4], humanity: 6 } });
	const done = await screen.findByRole('dialog', { name: 'Remorse Failure' });
	expect(within(done).getByRole('img', { name: 'Dice: 2, 4' })).toBeInTheDocument();
	// Humanity stays on screen, now as the test left it, the Lasombra card stays locked (so the
	// modal keeps its height), and the buttons give way to Done
	expect(within(done).getByText('Humanity')).toBeInTheDocument();
	expect(within(done).getByRole('checkbox', { name: 'Lasombra alternative Bane' })).toBeDisabled();
	expect(within(done).getByRole('button', { name: 'Done' })).toBeInTheDocument();
});

test("the character's live update during the reveal doesn't change the roll's text", async () => {
	const user = userEvent.setup();
	remorse.mockResolvedValueOnce({ result: { remorseful: false, dice: [2, 4], humanity: 6 } });
	const { rerender } = render(RemorseModal, {
		character: character(1),
		stepDelay: 0,
		revealDelay: 0,
		open: true
	});
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Roll' }));
	// The test's own save arrives: Humanity 6, no Stains
	await rerender({ character: { ...character(0), humanity: 6 } });

	expect(await within(dialog).findByRole('status')).toHaveTextContent(
		'Humanity drops from 7 to 6.'
	);
});

test('the successes move to the end, each group in the order rolled', async () => {
	const user = userEvent.setup();
	remorse.mockResolvedValueOnce({ result: { remorseful: true, dice: [8, 2, 6, 4], humanity: 7 } });
	renderModal({ ...character(1), humanity: 5 }); // 4 dice
	await user.click(within(await modal()).getByRole('button', { name: 'Roll' }));

	const dialog = await screen.findByRole('dialog', { name: 'Remorse Success' });
	expect(within(dialog).getByRole('img', { name: 'Dice: 2, 4, 8, 6' })).toBeInTheDocument();
});
