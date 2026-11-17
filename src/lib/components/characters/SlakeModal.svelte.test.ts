import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import type { Character } from '$lib/types';
import SlakeModal from './SlakeModal.svelte';

const slake = vi.hoisted(() => vi.fn());
vi.mock('$lib/characterActions', () => ({ slake }));
// No busy delay: the work's own promise decides when it's done
vi.mock('$lib/busy', () => ({ atLeast: <T>(work: Promise<T>): Promise<T> => work }));

beforeEach(() => {
	slake.mockReset().mockResolvedValue({ result: { frenzy: false } });
});

/** A vampire at a Hunger. */
const vampire = (hunger = 3, potency = 1): Character => ({
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
	potency,
	hunger,
	traits: []
});

/** Render the modal open, with `open` as state so its closing shows. Returns that state. */
const renderModal = (hunger = 3, potency = 1): { open: boolean } => {
	const bound = $state({ open: true });
	render(SlakeModal, {
		character: vampire(hunger, potency),
		get open() {
			return bound.open;
		},
		set open(next: boolean) {
			bound.open = next;
		}
	});
	return bound;
};

/** The modal's slake buttons' names, in order. */
const choices = (dialog: HTMLElement): string[] =>
	within(dialog)
		.getAllByRole('button', { name: /^Slake \d/ })
		.map((button) => button.getAttribute('aria-label') ?? '');

test('there is one button per amount there is to slake, each with its cost and the Hunger left', async () => {
	renderModal(5, 1);
	const dialog = await screen.findByRole('dialog', { name: 'Slake Hunger' });

	expect(choices(dialog)).toEqual([
		'Slake 1: harmless, Hunger 4 left',
		'Slake 2: harmless, Hunger 3 left',
		'Slake 3: harmful drink, Hunger 2 left',
		'Slake 4: harmful drink, Hunger 1 left',
		'Slake 5: full drain, the victim dies, Hunger 0 left'
	]);
});

test('there are only as many buttons as the Hunger there is', async () => {
	renderModal(2, 1);
	const dialog = await screen.findByRole('dialog');

	expect(choices(dialog)).toEqual([
		'Slake 1: harmless, Hunger 1 left',
		'Slake 2: full drain, the victim dies, Hunger 0 left'
	]);
});

test('at high Blood Potency, every drink is harmful, and the only drain takes Hunger to 0', async () => {
	renderModal(5, 6);
	const dialog = await screen.findByRole('dialog');

	// Slaking 3 or 4 would need a drain too, but a drain takes Hunger to 0
	expect(choices(dialog)).toEqual([
		'Slake 1: harmful drink, Hunger 4 left',
		'Slake 2: harmful drink, Hunger 3 left',
		'Slake 5: full drain, the victim dies, Hunger 0 left'
	]);
});

test('below the drain floor, only the drain to 0 is offered', async () => {
	renderModal(3, 9); // At BP 9, going below Hunger 3 needs a drain
	const dialog = await screen.findByRole('dialog');

	expect(choices(dialog)).toEqual(['Slake 3: full drain, the victim dies, Hunger 0 left']);
});

test('clicking an amount slakes it, then closes', async () => {
	const user = userEvent.setup();
	const bound = renderModal(3);
	const dialog = await screen.findByRole('dialog');

	await user.click(within(dialog).getByRole('button', { name: /^Slake 2:/ }));

	expect(slake).toHaveBeenCalledWith('abc', { amount: 2 });
	await waitFor(() => expect(bound.open).toBe(false));
});

test('while slaking, a spinner takes the place of the choices, until the modal closes', async () => {
	const user = userEvent.setup();
	let answer: (outcome: unknown) => void = () => {};
	slake.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
	const bound = renderModal(3);
	const dialog = await screen.findByRole('dialog');

	await user.click(within(dialog).getByRole('button', { name: /^Slake 2:/ }));

	expect(within(dialog).getByRole('status')).toHaveTextContent('Slaking…');
	expect(within(dialog).queryByRole('button')).not.toBeInTheDocument();
	answer({ result: { frenzy: false } });
	await waitFor(() => expect(bound.open).toBe(false));
});

test('a failed Slake says why, and stays open', async () => {
	const user = userEvent.setup();
	slake.mockResolvedValueOnce({ error: 'Nadia has no Hunger.' });
	const bound = renderModal(3);
	const dialog = await screen.findByRole('dialog');

	await user.click(within(dialog).getByRole('button', { name: /^Slake 1:/ }));

	expect(await within(dialog).findByRole('alert')).toHaveTextContent('Nadia has no Hunger.');
	expect(bound.open).toBe(true);
	// The choices come back, to try again
	expect(within(dialog).getByRole('button', { name: /^Slake 1:/ })).toBeInTheDocument();
});

test.each([
	[1, null],
	[2, 'Animal and bagged blood slakes only half Hunger.'],
	[4, 'Animal and bagged blood slakes no Hunger.']
])('at Blood Potency %i, the animal and bagged blood note is %j', async (potency, note) => {
	renderModal(5, potency);
	const dialog = await screen.findByRole('dialog');

	const shown = within(dialog).queryByText(/Animal and bagged blood/);
	expect(shown?.textContent?.trim() ?? null).toBe(note);
});

test('each choice says what it costs the victim, and a drain says so, not how much it slakes', async () => {
	renderModal(3, 1);
	const dialog = await screen.findByRole('dialog');

	const buttons = within(dialog).getAllByRole('button', { name: /^Slake \d/ });
	expect(buttons.map((button) => button.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
		'Slake 1 Harmless',
		'Slake 2 Harmless',
		'Drain Kills the victim'
	]);
});

test('hovering a choice previews it on the current Hunger', async () => {
	renderModal(3, 1);
	const dialog = await screen.findByRole('dialog');
	const current = within(dialog).getByRole('img', { name: 'Current Hunger 3' });
	/** How many of the current Hunger's drops are filled (the empty ones have no fill). */
	const filled = (): number =>
		[...current.querySelectorAll('path')].filter((path) => path.getAttribute('fill') !== 'none')
			.length;

	expect(filled()).toBe(3);
	// Fired directly: the open dialog turns off pointer events on <body>, which user-event refuses
	const choice = within(dialog).getByRole('button', { name: /^Slake 2:/ });
	await fireEvent.pointerEnter(choice);
	expect(filled()).toBe(1);
	// Leaving a row keeps its preview (no flicker in the gaps between rows); leaving the list clears it
	await fireEvent.pointerLeave(choice);
	expect(filled()).toBe(1);
	await fireEvent.pointerEnter(within(dialog).getByRole('button', { name: /^Slake 1:/ }));
	expect(filled()).toBe(2);
	await fireEvent.pointerLeave(within(dialog).getByRole('group', { name: 'Amounts to slake' }));
	expect(filled()).toBe(3);
});

test('the current Hunger shows above the choices', async () => {
	renderModal(3);
	const dialog = await screen.findByRole('dialog');

	expect(within(dialog).getByRole('img', { name: 'Current Hunger 3' })).toBeInTheDocument();
});

test.each([
	[3, false],
	[4, true],
	[5, true]
])('at Hunger %i, the frenzy test is warned of: %s', async (hunger, warned) => {
	renderModal(hunger);
	const dialog = await screen.findByRole('dialog');

	expect(within(dialog).queryByText(/calls for a frenzy test/) !== null).toBe(warned);
});

test('a slake that calls for a frenzy test stays open to say so, then Done closes', async () => {
	const user = userEvent.setup();
	slake.mockResolvedValueOnce({ result: { frenzy: true } });
	const bound = renderModal(4);
	const dialog = await screen.findByRole('dialog');

	await user.click(within(dialog).getByRole('button', { name: /^Slake 2:/ }));

	const result = await screen.findByRole('dialog', { name: 'Hunger Slaked' });
	const status = within(result).getByRole('status');
	expect(status).toHaveTextContent('Hunger 4 → 2');
	expect(status).toHaveTextContent('Slaking from Hunger 4: test for Hunger frenzy (Difficulty 3).');
	expect(bound.open).toBe(true);
	await user.click(within(result).getByRole('button', { name: 'Done' }));
	await waitFor(() => expect(bound.open).toBe(false));
});
