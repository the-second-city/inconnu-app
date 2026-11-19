import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import type { Character, MendResult, Splat } from '$lib/types';
import MendModal from './MendModal.svelte';

const mend = vi.hoisted(() => vi.fn());
vi.mock('$lib/api/characterActions', () => ({ mend }));

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
const modal = (): Promise<HTMLElement> => screen.findByRole('dialog');

beforeEach(() => {
	mend.mockReset().mockResolvedValue({ result: result() });
});

test.each([
	// [type, splat, title, heals, cost, detail, button]
	[
		'superficial',
		'vampire',
		'Mend Damage',
		'Mends 2 Superficial Health damage',
		'1 Rouse Check',
		'50% chance Hunger rises',
		'Mend'
	],
	[
		'aggravated',
		'vampire',
		'Heal Aggravated Damage',
		'Heals 1 Aggravated Health damage',
		'3 Rouse Checks',
		'88% chance Hunger rises',
		'Heal'
	],
	[
		'superficial',
		'mortal',
		'Mend Damage',
		'Mends 0 Superficial Health damage',
		'No Rouse Check',
		'Mortals heal without Rousing',
		'Mend'
	],
	[
		'aggravated',
		'ghoul',
		'Heal Aggravated Damage',
		'Heals 1 Aggravated Health damage',
		'No Rouse Check',
		'Ghouls heal without Rousing',
		'Heal'
	]
] as [DamageType, Splat, string, string, string, string, string][])(
	'%s damage for a %s: titled %j, saying %j, costing %j',
	async (type, splat, title, heals, cost, detail, action) => {
		renderModal(type, splat);
		const dialog = await modal();

		expect(dialog).toHaveAccessibleName(title);
		expect(within(dialog).getByText(heals)).toBeInTheDocument();
		expect(
			within(dialog).getByRole('group', { name: `Cost: ${cost}` })
		).toHaveAccessibleDescription(detail);
		expect(within(dialog).getByRole('button', { name: action })).toBeInTheDocument();
	}
);

test.each([
	// [type, hunger, detail]
	['superficial', 5, '50% chance of frenzy'],
	['aggravated', 3, '88% chance Hunger rises; may cause torpor'],
	['aggravated', 5, '88% chance of torpor']
] as [DamageType, number, string][])(
	'%s damage at Hunger %i warns: %j',
	async (type, hunger, detail) => {
		render(MendModal, {
			character: { ...character(), hunger },
			type,
			stepDelay: 0,
			revealDelay: 0,
			handoffDelay: 0,
			open: true
		});
		const dialog = await modal();

		expect(within(dialog).getByRole('group', { name: /^Cost:/ })).toHaveAccessibleDescription(
			detail
		);
	}
);

test.each([
	// Blood Potency 2 mends 2 of '...//x'; Aggravated heals its one
	['superficial', ['/', '/']],
	['aggravated', ['x']]
] as [DamageType, string[]][])(
	'before %s healing, the track as it is marks the damage that would go away',
	async (type, marked) => {
		renderModal(type);
		const dialog = await modal();

		const boxes = [...dialog.querySelectorAll('[data-changed] [aria-label]')];
		expect(boxes.map((box) => box.getAttribute('aria-label'))).toEqual(
			marked.map((kind) => (kind === '/' ? 'Superficial damage' : 'Aggravated damage'))
		);
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
	expect(dialog.querySelectorAll('[data-changed]')).toHaveLength(1);
});

test("a vampire's result shows Hunger, with what the Rouse added", async () => {
	const user = userEvent.setup();
	mend.mockResolvedValueOnce({ result: result({ hunger: 3 }) });
	renderModal('superficial', 'vampire');
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Mend' }));

	const status = await within(dialog).findByRole('status');
	expect(status).toHaveTextContent('Hunger 2 → 3');
	// The gain pulses in the cost card's meter and in the Hunger the dice give way to
	expect(dialog.querySelectorAll('[data-gained]')).toHaveLength(2);
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

	expect(dialog.querySelectorAll('[data-changed]')).toHaveLength(1);
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

test('healing locks the buttons while the Rouse dice roll, then paints the outcome in place', async () => {
	const user = userEvent.setup();
	let answer: (outcome: unknown) => void = () => {};
	mend.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
	renderModal('aggravated');
	const dialog = await modal();
	expect(within(dialog).getByRole('img', { name: '3 Rouse dice' })).toBeInTheDocument();

	await user.click(within(dialog).getByRole('button', { name: 'Heal' }));

	expect(within(dialog).getByRole('img', { name: 'Rolling 3 Rouse dice' })).toBeInTheDocument();
	expect(within(dialog).getByRole('button', { name: 'Heal' })).toBeDisabled();
	expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
	answer({ result: result({ dice: [8, 2, 6], hunger: 3, track: '....//' }) });

	const done = await screen.findByRole('dialog', { name: 'Aggravated Damage Healed' });
	// The successes move to the end, each group in the order rolled
	expect(within(done).getByRole('img', { name: 'Rouse dice: 2, 8, 6' })).toBeInTheDocument();
	expect(within(done).getByRole('status')).toHaveTextContent('Healed 1 Aggravated Health damage');
	expect(
		within(done).getByRole('group', { name: 'Cost: 3 Rouse Checks' })
	).toHaveAccessibleDescription('1 of 3 Rouse Checks failed. Hunger rises to 3.');
	expect(within(done).getByRole('button', { name: 'Done' })).toBeInTheDocument();
});

test("the character's live update during the reveal doesn't change what the heal shows", async () => {
	const user = userEvent.setup();
	mend.mockResolvedValueOnce({ result: result({ dice: [3], hunger: 3 }) });
	const { rerender } = render(MendModal, {
		character: character(),
		type: 'superficial',
		stepDelay: 0,
		revealDelay: 0,
		handoffDelay: 0,
		open: true
	});
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Mend' }));
	// The heal's own save arrives: mended, at Hunger 3
	await rerender({ character: { ...character(), health: '..../x', hunger: 3 } });

	expect(await within(dialog).findByRole('status')).toHaveTextContent('Hunger 2 → 3');
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
	render(MendModal, {
		character: char,
		type,
		track: 'willpower',
		stepDelay: 0,
		revealDelay: 0,
		handoffDelay: 0,
		open: true
	});
};

test.each([
	['superficial', 'Recover Willpower', 'Recovers 2 Superficial Willpower damage', 'Recover'],
	['aggravated', 'Heal Aggravated Willpower', 'Heals 1 Aggravated Willpower damage', 'Heal']
] as [DamageType, string, string, string][])(
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
	expect(dialog.querySelectorAll('[data-changed]')).toHaveLength(2);
});

test.each([
	// [type, dice, hunger after, text]
	['superficial', [7], 2, 'Rouse Check succeeded. Hunger stays at 2.'],
	['superficial', [3], 3, 'Rouse Check failed. Hunger rises to 3.'],
	['aggravated', [7, 8, 9], 2, 'All 3 Rouse Checks succeeded. Hunger stays at 2.'],
	['aggravated', [2, 8, 4], 4, '2 of 3 Rouse Checks failed. Hunger rises to 4.']
] as [DamageType, number[], number, string][])(
	"a vampire's %s result with dice %j says how the Rouse went",
	async (type, dice, hunger, text) => {
		const user = userEvent.setup();
		mend.mockResolvedValueOnce({ result: result({ dice, hunger, track: '.....x' }) });
		renderModal(type); // At Hunger 2
		const dialog = await modal();

		await user.click(
			within(dialog).getByRole('button', { name: type === 'superficial' ? 'Mend' : 'Heal' })
		);

		expect(await within(dialog).findByRole('status')).toHaveTextContent(text);
	}
);

test('a failed Rouse at Hunger 5 says so, without a rise', async () => {
	const user = userEvent.setup();
	mend.mockResolvedValueOnce({ result: result({ dice: [3], hunger: 5, frenzy: true }) });
	render(MendModal, {
		character: { ...character(), hunger: 5 },
		type: 'superficial',
		stepDelay: 0,
		revealDelay: 0,
		handoffDelay: 0,
		open: true
	});
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Mend' }));

	expect(await within(dialog).findByRole('status')).toHaveTextContent(
		'Rouse Check failed at Hunger 5.'
	);
});

test("after healing, the cost card's warning stays only if the risk happened", async () => {
	const user = userEvent.setup();
	mend.mockResolvedValueOnce({ result: result({ dice: [7, 8, 9], hunger: 4, track: '...//.' }) });
	render(MendModal, {
		character: { ...character(), hunger: 4 }, // 3 Rouses at Hunger 4 risk torpor
		type: 'aggravated',
		stepDelay: 0,
		revealDelay: 0,
		handoffDelay: 0,
		open: true
	});
	const dialog = await modal();
	expect(within(dialog).getByRole('group', { name: /^Cost:/ })).toHaveClass('border-warning-500');

	await user.click(within(dialog).getByRole('button', { name: 'Heal' }));

	await within(dialog).findByRole('status');
	expect(within(dialog).getByRole('group', { name: /^Cost:/ })).not.toHaveClass(
		'border-warning-500'
	);
});

test('a moment after the dice are in, they give way to the Hunger they left', async () => {
	const user = userEvent.setup();
	mend.mockResolvedValueOnce({ result: result({ dice: [3], hunger: 3 }) });
	renderModal('superficial');
	const dialog = await modal();

	await user.click(within(dialog).getByRole('button', { name: 'Mend' }));

	const dice = await within(dialog).findByRole('img', { name: 'Rouse dice: 3' });
	// Crossfaded (no delay in tests): the dice faded out, the Hunger in
	await waitFor(() => expect(dice.parentElement).toHaveClass('opacity-0'));
});
