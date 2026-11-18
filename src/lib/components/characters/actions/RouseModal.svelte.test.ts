import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import type { Character, RouseResult, Splat, Trait } from '$lib/types';
import RouseModal from './RouseModal.svelte';

const rouse = vi.hoisted(() => vi.fn());
vi.mock('$lib/api/characterActions', () => ({ rouse }));

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
	dice: [[7]],
	...fields
});

/** Render the modal open, with `open` as state so its closing shows. Returns that state. */
const renderModal = (char: Character = character()): { open: boolean } => {
	const bound = $state({ open: true });
	render(RouseModal, {
		character: char,
		stepDelay: 0,
		revealDelay: 0,
		handoffDelay: 0,
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
	await user.click(within(dialog).getByRole('checkbox', { name: 'Apply Oblivion Stains' }));

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 1 Check' }));

	// With Stains, the result has two live regions: the Stains (under Humanity) and the rest
	const statuses = await within(dialog).findAllByRole('status');
	const said = statuses.map((status) => status.textContent).join(' ');
	expect(said).toContain('test for Hunger frenzy');
	expect(said).toContain('2 Oblivion Stains applied.');
	expect(said).toContain('Degeneration: 1 Aggravated Willpower damage.');
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

test('rolling hides the options and buttons, and tumbles a die per check', async () => {
	const user = userEvent.setup();
	let answer: (outcome: unknown) => void = () => {};
	rouse.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
	renderModal();
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 3 Checks' }));

	expect(within(dialog).queryByRole('button')).not.toBeInTheDocument();
	expect(within(dialog).getByRole('img', { name: 'Rolling 3 Rouse dice' })).toBeInTheDocument();
	answer({ result: result({ successes: 3, dice: [[7], [8], [9]] }) });
	await within(dialog).findByRole('status');
	expect(dialog).toHaveAccessibleName('Success');
});

test('the dice show in the order rolled, re-rolls after their first face', async () => {
	const user = userEvent.setup();
	rouse.mockResolvedValueOnce({
		result: result({ successes: 2, failures: 1, hunger: 3, dice: [[9], [3, 8], [2]] })
	});
	renderModal(character('vampire', 2));
	const dialog = await modal();
	await user.click(within(dialog).getByRole('checkbox', { name: 'Re-roll failures' }));

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 3 Checks' }));

	expect(
		await within(dialog).findByRole('img', { name: 'Rouse dice: 9; 3, then 8; 2' })
	).toBeInTheDocument();
	// Each check shows its final face, in place
	const shown = [...within(dialog).getByRole('img', { name: /^Rouse dice/ }).children].map((die) =>
		die.textContent?.trim()
	);
	expect(shown).toEqual(['9', '8', '2']);
});

test("with Oblivion Stains, a check's final 1 or 10 is red, and a re-rolled first face isn't", async () => {
	const user = userEvent.setup();
	rouse.mockResolvedValueOnce({
		result: result({ successes: 1, failures: 2, stains: 2, dice: [[10], [1, 1], [1, 7]] })
	});
	renderModal(character('vampire', 2, [OBLIVION]));
	const dialog = await modal();
	await user.click(within(dialog).getByRole('checkbox', { name: 'Apply Oblivion Stains' }));

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 3 Checks' }));

	await within(dialog).findByRole('button', { name: 'Done' });
	const dice = [...within(dialog).getByRole('img', { name: /^Rouse dice/ }).children];
	expect(dice.map((die) => die.classList.contains('preset-filled-primary-500'))).toEqual([
		true,
		true,
		false
	]);
});

test('without Oblivion Stains, 1s and 10s are plain', async () => {
	const user = userEvent.setup();
	rouse.mockResolvedValueOnce({ result: result({ successes: 1, failures: 1, dice: [[10], [1]] }) });
	renderModal(character('vampire', 2, [OBLIVION]));
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 2 Checks' }));

	await within(dialog).findByRole('status');
	const dice = [...within(dialog).getByRole('img', { name: /^Rouse dice/ }).children];
	expect(dice.some((die) => die.classList.contains('preset-filled-primary-500'))).toBe(false);
});

test('a moment after the result, the dice give way to the Hunger they left', async () => {
	const user = userEvent.setup();
	renderModal();
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 1 Check' }));

	const dice = await within(dialog).findByRole('img', { name: 'Rouse dice: 7' });
	await waitFor(() => expect(dice.parentElement).toHaveClass('opacity-0'));
});

test('with Oblivion Stains, Humanity shows with the dice, and the result with its Stains', async () => {
	const user = userEvent.setup();
	rouse.mockResolvedValueOnce({ result: result({ stains: 2, dice: [[10], [1]] }) });
	renderModal(character('vampire', 2, [OBLIVION])); // Humanity 7, no Stains
	const dialog = await modal();
	await user.click(within(dialog).getByRole('checkbox', { name: 'Apply Oblivion Stains' }));

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 2 Checks' }));

	expect(await within(dialog).findByText('2 Oblivion Stains applied.')).toBeInTheDocument();
	expect(within(dialog).getByText('Humanity')).toBeInTheDocument();
	expect(within(dialog).getAllByRole('img', { name: 'Stain' })).toHaveLength(2);
});

test('with Oblivion Stains but none landing, Humanity still shows, and says so', async () => {
	const user = userEvent.setup();
	renderModal(character('vampire', 2, [OBLIVION]));
	const dialog = await modal();
	await user.click(within(dialog).getByRole('checkbox', { name: 'Apply Oblivion Stains' }));

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 1 Check' }));

	expect(await within(dialog).findByText('No Oblivion Stains.')).toBeInTheDocument();
	expect(within(dialog).getByText('Humanity')).toBeInTheDocument();
});

test("without Oblivion Stains, the roll doesn't show Humanity", async () => {
	const user = userEvent.setup();
	renderModal();
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Rouse 1 Check' }));

	await within(dialog).findByRole('status');
	expect(within(dialog).queryByText('Humanity')).not.toBeInTheDocument();
});
