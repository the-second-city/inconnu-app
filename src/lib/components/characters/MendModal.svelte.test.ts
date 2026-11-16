import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import type { Character, MendResult, Splat } from '$lib/types';
import MendModal from './MendModal.svelte';

const mend = vi.hoisted(() => vi.fn());
vi.mock('$lib/characterActions', () => ({ mend }));

/** A character of the given splat with Superficial and Aggravated Health damage, at Hunger 2. */
const character = (splat: Splat = 'vampire'): Character => ({
	_id: 'abc',
	name: 'Nadia',
	guild: '111',
	user: '222',
	splat,
	profile: { description: null, biography: null, images: [] },
	health: '...//x',
	willpower: '.....',
	humanity: 7,
	stains: 0,
	potency: 2,
	hunger: 2,
	traits: []
});

/** A mend result, with any fields replaced. */
const result = (fields: Partial<MendResult> = {}): MendResult => ({
	track: '..../x', // One Superficial mended
	dice: [7],
	hunger: 2,
	frenzy: false,
	torpor: false,
	...fields
});

type DamageType = 'superficial' | 'aggravated';

/** Render the modal open for a kind of damage, with `open` as state. Returns that state. */
const renderModal = (
	type: DamageType = 'superficial',
	splat: Splat = 'vampire'
): { open: boolean } => {
	const bound = $state({ open: true });
	render(MendModal, {
		character: character(splat),
		type,
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
const modal = (): Promise<HTMLElement> => screen.findByRole('dialog');

beforeEach(() => {
	mend.mockReset().mockResolvedValue({ result: result() });
});

test.each([
	[
		'superficial',
		'vampire',
		'Mend Damage',
		'Mending Superficial damage costs a Rouse Check.',
		'Mend'
	],
	[
		'aggravated',
		'vampire',
		'Heal Aggravated Damage',
		'Healing Aggravated damage costs three Rouse Checks.',
		'Heal'
	],
	['superficial', 'mortal', 'Mend Damage', 'Nadia heals without Rousing.', 'Mend'],
	['aggravated', 'ghoul', 'Heal Aggravated Damage', 'Nadia heals without Rousing.', 'Heal']
] as [DamageType, Splat, string, string, string][])(
	'%s damage for a %s: titled %j, with its cost and a %s button',
	async (type, splat, title, cost, action) => {
		renderModal(type, splat);
		const dialog = await modal();

		expect(dialog).toHaveAccessibleName(title);
		expect(within(dialog).getByText(cost)).toBeInTheDocument();
		expect(within(dialog).getByRole('button', { name: action })).toBeInTheDocument();
	}
);

test('mending sends the kind of damage, then shows the healed track', async () => {
	const user = userEvent.setup();
	renderModal('superficial');
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Mend' }));

	expect(mend).toHaveBeenCalledWith('abc', { type: 'superficial', track: 'health' });
	await within(dialog).findByRole('status');
	expect(dialog).toHaveAccessibleName('Damage Mended');
	// ...//x became ..../x: one box changed
	expect(dialog.querySelectorAll('[data-healed]')).toHaveLength(1);
});

test("a vampire's result shows Hunger, with what the Rouse added", async () => {
	const user = userEvent.setup();
	mend.mockResolvedValueOnce({ result: result({ hunger: 3 }) });
	renderModal('superficial', 'vampire');
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Mend' }));

	const status = await within(dialog).findByRole('status');
	expect(status).toHaveTextContent('Hunger 2 → 3');
	expect(dialog.querySelectorAll('[data-gained]')).toHaveLength(1);
});

test("a mortal's result has no Hunger", async () => {
	const user = userEvent.setup();
	renderModal('superficial', 'mortal');
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Mend' }));

	expect(await within(dialog).findByRole('status')).not.toHaveTextContent('Hunger');
});

test('healing Aggravated damage warns of frenzy and torpor when they happen', async () => {
	const user = userEvent.setup();
	mend.mockResolvedValueOnce({
		result: result({ track: '...///', hunger: 5, frenzy: true, torpor: true })
	});
	renderModal('aggravated');
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Heal' }));

	const status = await within(dialog).findByRole('status');
	expect(dialog).toHaveAccessibleName('Aggravated Damage Healed');
	expect(status).toHaveTextContent('test for Hunger frenzy');
	expect(status).toHaveTextContent('Nadia falls into torpor.');
});

test('healing one Aggravated box marks only the box it freed, though the sorted track shifts', async () => {
	const user = userEvent.setup();
	// ...//x became ....//: the Aggravated box healed, leaving one more healthy box
	mend.mockResolvedValueOnce({ result: result({ track: '....//' }) });
	renderModal('aggravated');
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Heal' }));
	await within(dialog).findByRole('status');

	expect(dialog.querySelectorAll('[data-healed]')).toHaveLength(1);
});

test('a failed mend says why, and keeps the start', async () => {
	const user = userEvent.setup();
	mend.mockResolvedValueOnce({ error: 'Nadia has no Superficial Health damage to heal.' });
	renderModal();
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Mend' }));

	expect(await within(dialog).findByRole('alert')).toHaveTextContent(
		'Nadia has no Superficial Health damage to heal.'
	);
	expect(within(dialog).getByRole('button', { name: 'Mend' })).toBeInTheDocument();
});

test('mending hides the buttons, counting down from the Rouses', async () => {
	const user = userEvent.setup();
	let answer: (outcome: unknown) => void = () => {};
	mend.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
	renderModal('aggravated');
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Heal' }));

	expect(within(dialog).queryByRole('button')).not.toBeInTheDocument();
	await waitFor(() => expect(within(dialog).getByText('0')).toBeInTheDocument());
	answer({ result: result() });
	await within(dialog).findByRole('status');
});

test('Done closes', async () => {
	const user = userEvent.setup();
	const bound = renderModal();
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Mend' }));
	await user.click(await within(dialog).findByRole('button', { name: 'Done' }));

	await waitFor(() => expect(bound.open).toBe(false));
});

/** Render the modal open for Willpower damage, for a vampire with Resolve 3 and Composure 2. */
const renderWillpower = (type: DamageType): void => {
	const char = {
		...character('vampire'),
		willpower: '..//x',
		traits: [
			{ name: 'Resolve', rating: 3, type: 'attribute', subtraits: [] },
			{ name: 'Composure', rating: 2, type: 'attribute', subtraits: [] }
		]
	};
	render(MendModal, { character: char, type, track: 'willpower', stepDelay: 0, open: true });
};

test.each([
	['superficial', 'Recover Willpower', /Recovers 3 Superficial Willpower damage/, 'Recover'],
	['aggravated', 'Heal Aggravated Willpower', /Heals one Aggravated Willpower damage/, 'Heal']
] as [DamageType, string, RegExp, string][])(
	'Willpower %s damage: titled %j, with what it heals and a %s button, and no Rouse',
	async (type, title, cost, action) => {
		renderWillpower(type);
		const dialog = await modal();

		expect(dialog).toHaveAccessibleName(title);
		expect(within(dialog).getByText(cost)).toBeInTheDocument();
		expect(within(dialog).queryByText(/Rouse/)).not.toBeInTheDocument();
		expect(within(dialog).getByRole('button', { name: action })).toBeInTheDocument();
	}
);

test('recovering Willpower sends the track, and shows it without Hunger', async () => {
	const user = userEvent.setup();
	mend.mockResolvedValueOnce({ result: result({ track: '....x', dice: [] }) });
	renderWillpower('superficial');
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Recover' }));

	expect(mend).toHaveBeenCalledWith('abc', { type: 'superficial', track: 'willpower' });
	const status = await within(dialog).findByRole('status');
	expect(dialog).toHaveAccessibleName('Willpower Recovered');
	expect(status).toHaveTextContent('Willpower');
	expect(status).not.toHaveTextContent('Hunger');
	// ..//x became ....x: two more healthy boxes
	expect(dialog.querySelectorAll('[data-healed]')).toHaveLength(2);
});
