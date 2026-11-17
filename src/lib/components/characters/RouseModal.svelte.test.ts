import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import type { Character, RouseResult, Splat, Trait } from '$lib/types';
import RouseModal from './RouseModal.svelte';

const rouse = vi.hoisted(() => vi.fn());
vi.mock('$lib/characterActions', () => ({ rouse }));

/** A character of the given splat, Blood Potency, and traits, at Hunger 2. */
const character = (splat: Splat = 'vampire', potency = 2, traits: Trait[] = []): Character => ({
	_id: 'abc',
	name: 'Nadia',
	guild: '111',
	user: '222',
	splat,
	profile: { description: null, biography: null, images: [] },
	health: '......',
	willpower: '.....',
	humanity: 7,
	stains: 0,
	potency,
	hunger: 2,
	traits
});

const OBLIVION: Trait = { name: 'Oblivion', rating: 2, type: 'discipline', subtraits: [] };

/** A Rouse result, with any fields replaced. */
const result = (fields: Partial<RouseResult> = {}): RouseResult => ({
	successes: 1,
	failures: 0,
	hunger: 2,
	frenzy: false,
	aggravated: 0,
	stains: 0,
	degeneration: 0,
	...fields
});

/** Render the modal open, with `open` as state so its closing shows. Returns that state. */
const renderModal = (char: Character = character()): { open: boolean } => {
	const bound = $state({ open: true });
	render(RouseModal, {
		character: char,
		stepDelay: 0,
		get open() {
			return bound.open;
		},
		set open(next: boolean) {
			bound.open = next;
		}
	});
	return bound;
};

/** The open modal. */
const modal = (): Promise<HTMLElement> => screen.findByRole('dialog', { name: 'Rouse Check' });

beforeEach(() => {
	rouse.mockReset().mockResolvedValue({ result: result() });
});

test('a vampire chooses 1 to 3 checks, each with the chance Hunger rises', async () => {
	renderModal(); // At Hunger 2
	const dialog = await modal();

	const rows = within(within(dialog).getByRole('group', { name: 'Checks to roll' })).getAllByRole(
		'button'
	);
	expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
		'Rouse 1 Check',
		'Rouse 2 Checks',
		'Rouse 3 Checks'
	]);
	expect(rows[0]).toHaveAccessibleDescription('50% chance Hunger rises');
	expect(rows[2]).toHaveAccessibleDescription('88% chance Hunger rises');
});

test('re-rolling failures lowers the chances', async () => {
	const user = userEvent.setup();
	renderModal();
	const dialog = await modal();

	await user.click(within(dialog).getByRole('checkbox', { name: 'Re-roll failures' }));

	expect(
		within(dialog).getByRole('button', { name: 'Rouse 2 Checks' })
	).toHaveAccessibleDescription('44% chance Hunger rises');
});

test.each([
	[4, 1, '50% chance Hunger rises'],
	[4, 2, '75% chance Hunger rises; may frenzy'],
	[5, 1, '50% chance of frenzy']
])('at Hunger %i, %i checks: %s', async (hunger, checks, detail) => {
	renderModal({ ...character(), hunger });
	const dialog = await modal();

	expect(
		within(dialog).getByRole('button', { name: new RegExp(`^Rouse ${checks} Checks?$`) })
	).toHaveAccessibleDescription(detail);
});

test('hovering a choice previews the Hunger it could reach on the current Hunger', async () => {
	renderModal(); // At Hunger 2
	const dialog = await modal();
	const current = within(dialog).getByRole('img', { name: 'Current Hunger 2' });
	/** How many of the current Hunger's drops are filled, faint or not. */
	const filled = (): number =>
		[...current.querySelectorAll('path')].filter((path) => path.getAttribute('fill') !== 'none')
			.length;

	expect(filled()).toBe(2);
	// Fired directly: the open dialog turns off pointer events on <body>, which user-event refuses
	await fireEvent.pointerEnter(within(dialog).getByRole('button', { name: 'Rouse 3 Checks' }));
	expect(filled()).toBe(5);
	await fireEvent.pointerLeave(within(dialog).getByRole('group', { name: 'Checks to roll' }));
	expect(filled()).toBe(2);
});

test.each([
	[0, false],
	[1, true]
])('at Blood Potency %i, re-rolling is offered: %s', async (potency, offered) => {
	renderModal(character('vampire', potency));

	const box = within(await modal()).queryByRole('checkbox', { name: 'Re-roll failures' });
	expect(box !== null).toBe(offered);
});

test.each([
	[[], false],
	[[OBLIVION], true]
])('Oblivion Stains are offered only with Oblivion (%#)', async (traits, offered) => {
	renderModal(character('vampire', 2, traits));

	const box = within(await modal()).queryByRole('checkbox', { name: 'Apply Oblivion Stains' });
	expect(box !== null).toBe(offered);
});

test("a ghoul is warned they'll take damage, with no options", async () => {
	renderModal(character('ghoul', 0));
	const dialog = await modal();

	expect(within(dialog).getByText(/Rousing deals 1 Aggravated Health damage/)).toBeInTheDocument();
	expect(within(dialog).queryByRole('group', { name: 'Checks to roll' })).not.toBeInTheDocument();
	expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument();
});

test('Rouse sends the choices, then shows the result', async () => {
	const user = userEvent.setup();
	rouse.mockResolvedValueOnce({ result: result({ successes: 1, failures: 1, hunger: 3 }) });
	renderModal(character('vampire', 2, [OBLIVION]));
	const dialog = await modal();

	await user.click(within(dialog).getByRole('checkbox', { name: 'Re-roll failures' }));
	await user.click(within(dialog).getByRole('button', { name: 'Rouse 2 Checks' }));

	expect(rouse).toHaveBeenCalledWith('abc', { count: 2, reroll: true, oblivion_stains: false });
	const status = await within(dialog).findByRole('status');
	expect(dialog).toHaveAccessibleName('Hunger Increase');
	expect(status).toHaveTextContent('Hunger 2 → 3');
});

test('the result warns of frenzy, and shows Stains and degeneration only when they happened', async () => {
	const user = userEvent.setup();
	rouse.mockResolvedValueOnce({
		result: result({
			failures: 1,
			successes: 0,
			hunger: 5,
			frenzy: true,
			stains: 2,
			degeneration: 1
		})
	});
	renderModal(character('vampire', 2, [OBLIVION]));
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 1 Check' }));

	const status = await within(dialog).findByRole('status');
	expect(status).toHaveTextContent('test for Hunger frenzy');
	expect(status).toHaveTextContent('2 Oblivion Stains applied.');
	expect(status).toHaveTextContent('Degeneration: 1 Aggravated Willpower damage.');
});

test('a plain result has no frenzy, Stains, or degeneration', async () => {
	const user = userEvent.setup();
	renderModal();
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 1 Check' }));

	const status = await within(dialog).findByRole('status');
	expect(status).not.toHaveTextContent('frenzy');
	expect(status).not.toHaveTextContent('Stain');
	expect(status).not.toHaveTextContent('Degeneration');
});

test("a ghoul's result is their damage", async () => {
	const user = userEvent.setup();
	rouse.mockResolvedValueOnce({ result: result({ successes: 0, aggravated: 1 }) });
	renderModal(character('ghoul', 0));
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Rouse' }));

	expect(await within(dialog).findByRole('status')).toHaveTextContent(
		'Nadia took 1 Aggravated Health damage.'
	);
	expect(dialog).toHaveAccessibleName('Rouse Check');
});

test('a failed Rouse says why, and keeps the options', async () => {
	const user = userEvent.setup();
	rouse.mockResolvedValueOnce({ error: "Couldn't reach Inconnu to Rouse." });
	renderModal();
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 1 Check' }));

	expect(await within(dialog).findByRole('alert')).toHaveTextContent(
		"Couldn't reach Inconnu to Rouse."
	);
	expect(within(dialog).getByRole('button', { name: 'Rouse 1 Check' })).toBeEnabled();
});

test('Rouse Again returns to the options, and Done closes', async () => {
	const user = userEvent.setup();
	const bound = renderModal();
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 1 Check' }));
	await user.click(await within(dialog).findByRole('button', { name: 'Rouse Again' }));
	expect(within(dialog).getByRole('button', { name: 'Rouse 1 Check' })).toBeInTheDocument();

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 1 Check' }));
	await user.click(await within(dialog).findByRole('button', { name: 'Done' }));
	await waitFor(() => expect(bound.open).toBe(false));
});

test('the Hunger the Rouse added is marked apart from the Hunger already there', async () => {
	const user = userEvent.setup();
	rouse.mockResolvedValueOnce({ result: result({ successes: 0, failures: 2, hunger: 4 }) });
	renderModal(); // At Hunger 2
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 1 Check' }));
	await within(dialog).findByRole('status');

	expect(dialog.querySelectorAll('[data-gained]')).toHaveLength(2);
});

test.each([
	[{ successes: 2, failures: 0, hunger: 2 }, 'Success'],
	[{ successes: 1, failures: 1, hunger: 3 }, 'Hunger Increase'],
	[{ successes: 0, failures: 1, hunger: 5, frenzy: true }, 'Hunger Increase']
])('the result for %o is titled %s', async (fields, label) => {
	const user = userEvent.setup();
	rouse.mockResolvedValueOnce({ result: result(fields) });
	renderModal();
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 1 Check' }));

	await within(dialog).findByRole('status');
	expect(dialog).toHaveAccessibleName(label);
});

test('rolling hides the options and buttons, and counts down from the number of checks', async () => {
	const user = userEvent.setup();
	let answer: (outcome: unknown) => void = () => {};
	rouse.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
	renderModal();
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 3 Checks' }));

	expect(within(dialog).queryByRole('button')).not.toBeInTheDocument();
	expect(within(dialog).getByText('Rolling…')).toBeInTheDocument();
	// The countdown runs out (no delay in tests) and waits at 0 for the API
	await waitFor(() => expect(within(dialog).getByText('0')).toBeInTheDocument());
	answer({ result: result() });
	await within(dialog).findByRole('status');
	expect(dialog).toHaveAccessibleName('Success');
});

test('when Stains are applied, the result shows Humanity with them', async () => {
	const user = userEvent.setup();
	rouse.mockResolvedValueOnce({ result: result({ stains: 2 }) });
	renderModal(character('vampire', 2, [OBLIVION])); // Humanity 7, no Stains
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 1 Check' }));

	const status = await within(dialog).findByRole('status');
	expect(within(status).getByText('Humanity')).toBeInTheDocument();
	expect(within(status).getAllByRole('img', { name: /Stain/ })).toHaveLength(2);
});

test("without Stains, the result doesn't show Humanity", async () => {
	const user = userEvent.setup();
	renderModal();
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 1 Check' }));

	const status = await within(dialog).findByRole('status');
	expect(within(status).queryByText('Humanity')).not.toBeInTheDocument();
});
