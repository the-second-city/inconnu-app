import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import type { Character } from '$lib/types';
import FrenzyModal from './FrenzyModal.svelte';

const frenzy = vi.hoisted(() => vi.fn());
vi.mock('$lib/characterActions', () => ({ frenzy }));

beforeEach(() => {
	frenzy.mockReset().mockResolvedValue({
		result: { passed: true, critical: false, pool: 4, dice: [3, 8, 6, 7], original: null }
	});
});

/** A vampire with 3 undamaged Willpower at Humanity 7 (5 dice to resist), at a Blood Potency. */
const character = (potency = 3): Character => ({
	_id: 'abc',
	name: 'Nadia',
	guild: '111',
	user: '222',
	splat: 'vampire',
	profile: { description: null, biography: null, images: [] },
	health: '......',
	willpower: '.../x',
	humanity: 7,
	stains: 0,
	potency,
	hunger: 2,
	traits: []
});

/** Render the modal open, with `open` as state so its closing shows. Returns that state. */
const renderModal = (char: Character = character()): { open: boolean } => {
	const bound = $state({ open: true });
	render(FrenzyModal, {
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
const modal = (): Promise<HTMLElement> => screen.findByRole('dialog', { name: 'Frenzy Test' });

test('the options say how many dice to roll, and how many successes resist', async () => {
	renderModal();
	const dialog = await modal();

	expect(within(dialog).getByText(/^Roll 5 dice/)).toHaveTextContent(
		'Roll 5 dice (Willpower 3, 2 for Humanity 7).'
	);
	expect(within(dialog).getByText('3 successes to resist')).toBeInTheDocument();
});

test('the Difficulty steps from 1 to 10', async () => {
	const user = userEvent.setup();
	renderModal();
	const dialog = await modal();

	const more = within(dialog).getByRole('button', { name: 'More Difficulty' });
	for (let i = 0; i < 7; i++) await user.click(more);
	expect(more).toBeDisabled();
	expect(within(dialog).getByText('10 successes to resist')).toBeInTheDocument();

	const less = within(dialog).getByRole('button', { name: 'Less Difficulty' });
	for (let i = 0; i < 9; i++) await user.click(less);
	expect(less).toBeDisabled();
	expect(within(dialog).getByText('1 success to resist')).toBeInTheDocument();
});

test('the penalties are exclusive, and each takes its dice', async () => {
	const user = userEvent.setup();
	renderModal(character(3)); // Bane Severity 3
	const dialog = await modal();
	const brujah = within(dialog).getByRole('checkbox', { name: 'Brujah Fury' });
	const malkavian = within(dialog).getByRole('checkbox', { name: 'Malkavian Terror' });

	await user.click(brujah);
	expect(within(dialog).getByText(/^Roll 2 dice/)).toHaveTextContent('−3 for Brujah Fury');

	await user.click(malkavian);
	expect(brujah).not.toBeChecked();
	expect(within(dialog).getByText(/^Roll 3 dice/)).toHaveTextContent('−2 for Malkavian Terror');

	await user.click(malkavian);
	expect(within(dialog).getByText(/^Roll 5 dice/)).toBeInTheDocument();
});

test('Brujah Fury is only offered with a Bane', async () => {
	renderModal(character(0));
	const dialog = await modal();

	expect(within(dialog).queryByRole('checkbox', { name: 'Brujah Fury' })).not.toBeInTheDocument();
	expect(within(dialog).getByRole('checkbox', { name: 'Malkavian Terror' })).toBeInTheDocument();
});

test('bonus dice and advantages combine, and the options are sent', async () => {
	const user = userEvent.setup();
	renderModal();
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'More Bonus Dice' }));
	await user.click(within(dialog).getByRole('button', { name: /^Gentle Mind/ }));
	await user.click(within(dialog).getByRole('button', { name: /^Cold Dead Hunger/ }));
	await user.click(within(dialog).getByRole('checkbox', { name: 'Malkavian Terror' }));
	expect(within(dialog).getByText(/^Roll 10 dice/)).toHaveTextContent(
		'Roll 10 dice (Willpower 3, 2 for Humanity 7, −2 for Malkavian Terror, +1, +2 from Cold Dead Hunger, +4 from Gentle Mind).'
	);

	await user.click(within(dialog).getByRole('button', { name: 'Roll' }));
	expect(frenzy).toHaveBeenCalledWith('abc', {
		difficulty: 3,
		penalty: 'malkavian',
		bonus: 1,
		advantages: ['gentle_mind', 'cold_dead_hunger']
	});
});

test('an advantage toggles off again', async () => {
	const user = userEvent.setup();
	renderModal();
	const dialog = await modal();
	const jewel = within(dialog).getByRole('button', { name: /^Jewel in the Garden/ });

	await user.click(jewel);
	expect(jewel).toHaveAttribute('aria-pressed', 'true');
	await user.click(jewel);
	expect(jewel).toHaveAttribute('aria-pressed', 'false');
	expect(within(dialog).getByText(/^Roll 5 dice/)).toBeInTheDocument();
});

test('The Dream says it re-rolls failures', async () => {
	const user = userEvent.setup();
	renderModal();
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: /^The Dream/ }));
	expect(within(dialog).getByText(/^Roll 5 dice/)).toHaveTextContent(
		're-rolling up to 3 failures (The Dream)'
	);
});

test.each([
	[{ passed: true, critical: false }, 'Frenzy Success', 'You spend 1 turn resisting frenzy.'],
	[{ passed: true, critical: true }, 'Critical Success', 'Resist frenzy without losing a turn.'],
	[{ passed: false, critical: false }, 'Frenzy Failure', 'You succumb to the Beast.']
])('the outcome shows in place: %o', async (outcome, title, message) => {
	frenzy.mockResolvedValue({ result: { pool: 2, dice: [2, 9], original: null, ...outcome } });
	const user = userEvent.setup();
	const bound = renderModal();
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Roll' }));

	const done = await screen.findByRole('dialog', { name: title });
	expect(within(done).getByRole('status')).toHaveTextContent(
		`1 success against Difficulty 3. ${message}`
	);
	expect(within(done).getByRole('img', { name: 'Dice: 2, 9' })).toBeInTheDocument();
	await user.click(within(done).getByRole('button', { name: 'Done' }));
	expect(bound.open).toBe(false);
});

test("The Dream's re-rolled dice end on their final faces", async () => {
	frenzy.mockResolvedValue({
		result: { passed: false, critical: false, pool: 3, dice: [8, 9, 4], original: [2, 9, 1] }
	});
	const user = userEvent.setup();
	renderModal();
	await user.click(within(await modal()).getByRole('button', { name: 'Roll' }));

	const done = await screen.findByRole('dialog', { name: 'Frenzy Failure' });
	expect(within(done).getByRole('img', { name: 'Dice: 8, 9, 4' })).toBeInTheDocument();
	expect(within(done).getByRole('status')).toHaveTextContent('2 successes against Difficulty 3.');
});

test('an error unlocks the options, saying why', async () => {
	frenzy.mockResolvedValue({ error: 'Nope.' });
	const user = userEvent.setup();
	renderModal();
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Roll' }));

	expect(await within(dialog).findByRole('alert')).toHaveTextContent('Nope.');
	await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Roll' })).toBeEnabled());
});
