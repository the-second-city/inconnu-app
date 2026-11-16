import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import type { Character, Splat } from '$lib/types';
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
	render(Tracker, { character: character('...../x'), track: 'health', editing: false });

	expect(boxes()).toEqual(['Aggravated damage', 'Superficial damage', ...Array(5).fill('Healthy')]);
});

test('shows the chosen track', () => {
	render(Tracker, { character: character('......', '..//x'), track: 'willpower', editing: false });

	expect(boxes()).toEqual([
		'Aggravated damage',
		'Superficial damage',
		'Superficial damage',
		'Healthy',
		'Healthy'
	]);
});

/**
 * Render a track as the character sheet does, with the character as reactive state so the
 * track's edits are written back to it. Returns that state.
 */
const renderTrack = (
	health: string,
	track: 'health' | 'willpower' = 'health',
	editing = true
): Character => {
	const bound = $state(character(health, '.....'));
	render(Tracker, { character: bound, track, editing });
	return bound;
};

/** Open the track's controls by clicking its boxes. */
const openControls = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
	await user.click(screen.getByRole('button', { name: /^(Healthy|Superficial|Aggravated)/ }));
};

test('the boxes are only a button while editing', () => {
	renderTrack('.....', 'health', false);

	expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
	expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('the controls stay closed when editing starts again', async () => {
	const user = userEvent.setup();
	const { rerender } = render(Tracker, {
		character: character('.....'),
		track: 'health',
		editing: true
	});
	await openControls(user);
	expect(await screen.findByRole('button', { name: 'Increase Superficial' })).toBeInTheDocument();

	await rerender({ editing: false });
	await rerender({ editing: true });

	expect(screen.queryByRole('button', { name: 'Increase Superficial' })).not.toBeInTheDocument();
});

test.each(['health', 'willpower'] as const)(
	'%s has controls for each kind of damage',
	async (track) => {
		const user = userEvent.setup();
		renderTrack('.....', track);

		await openControls(user);

		for (const level of ['Superficial', 'Aggravated', 'Boxes']) {
			expect(await screen.findByRole('button', { name: `Increase ${level}` })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: `Decrease ${level}` })).toBeInTheDocument();
		}
	}
);

test('adding damage updates the track and the character', async () => {
	const user = userEvent.setup();
	const bound = renderTrack('.....');
	await openControls(user);

	await user.click(await screen.findByRole('button', { name: 'Increase Aggravated' }));
	await user.click(screen.getByRole('button', { name: 'Increase Superficial' }));

	expect(boxes()).toEqual(['Aggravated damage', 'Superficial damage', ...Array(3).fill('Healthy')]);
	expect(bound.health).toBe('.../x');
});

test('damage can be removed only when there is some', async () => {
	const user = userEvent.setup();
	renderTrack('..../');
	await openControls(user);

	expect(await screen.findByRole('button', { name: 'Decrease Aggravated' })).toBeDisabled();
	await user.click(screen.getByRole('button', { name: 'Decrease Superficial' }));

	expect(boxes()).toEqual(Array(5).fill('Healthy'));
	expect(screen.getByRole('button', { name: 'Decrease Superficial' })).toBeDisabled();
});

test('a full track takes no more damage', async () => {
	const user = userEvent.setup();
	renderTrack('xxx');
	await openControls(user);

	expect(await screen.findByRole('button', { name: 'Increase Aggravated' })).toBeDisabled();
	expect(screen.getByRole('button', { name: 'Increase Superficial' })).toBeDisabled();
});

test('box controls add and remove boxes', async () => {
	const user = userEvent.setup();
	const bound = renderTrack('.....');
	await openControls(user);

	await user.click(await screen.findByRole('button', { name: 'Increase Boxes' }));
	expect(boxes()).toHaveLength(6);

	await user.click(screen.getByRole('button', { name: 'Decrease Boxes' }));
	await user.click(screen.getByRole('button', { name: 'Decrease Boxes' }));
	expect(boxes()).toHaveLength(4);
	expect(bound.health).toBe('....');
});

test.each([
	['health', 4],
	['willpower', 3]
] as const)('%s keeps at least %i boxes', async (track, min) => {
	const user = userEvent.setup();
	const shortest = '.'.repeat(min);
	render(Tracker, { character: character(shortest, shortest), track, editing: true });
	await openControls(user);

	expect(await screen.findByRole('button', { name: 'Decrease Boxes' })).toBeDisabled();
	expect(screen.getByRole('button', { name: 'Increase Boxes' })).toBeEnabled();
});

test.each([
	['health', 20],
	['willpower', 20]
] as const)('%s has at most %i boxes', async (track, max) => {
	const user = userEvent.setup();
	const full = '.'.repeat(max);
	render(Tracker, { character: character(full, full), track, editing: true });
	await openControls(user);

	expect(await screen.findByRole('button', { name: 'Increase Boxes' })).toBeDisabled();
	expect(screen.getByRole('button', { name: 'Decrease Boxes' })).toBeEnabled();
});

/** Render a track in view mode, offering its actions, and open them. Returns the action menu. */
const openActions = async (
	health: string,
	track: 'health' | 'willpower' = 'health',
	willpower = '.....'
): Promise<HTMLElement> => {
	const user = userEvent.setup();
	render(Tracker, {
		character: character(health, willpower),
		track,
		editing: false,
		actionable: true
	});
	await user.click(
		screen.getByRole('button', { name: `${track === 'health' ? 'Health' : 'Willpower'} actions` })
	);
	return screen.findByRole('dialog');
};

/** The names of a menu's buttons, with "(disabled)" after those that are. */
const menuButtons = (menu: HTMLElement): string[] =>
	within(menu)
		.getAllByRole('button')
		.map(
			(button) =>
				`${button.textContent?.trim()}${button.hasAttribute('disabled') ? ' (disabled)' : ''}`
		);

test('the track offers no actions unless actionable', () => {
	renderTrack('..//x', 'health', false);

	expect(screen.queryByRole('button', { name: 'Health actions' })).not.toBeInTheDocument();
});

test('while editing, an actionable track opens the corrections, not the actions', () => {
	render(Tracker, {
		character: character('.....'),
		track: 'health',
		editing: true,
		actionable: true
	});

	expect(screen.queryByRole('button', { name: 'Health actions' })).not.toBeInTheDocument();
});

test('Health offers damage and mending', async () => {
	const menu = await openActions('..//x');

	expect(menuButtons(menu)).toEqual(['Take Damage', 'Superficial', 'Aggravated']);
	expect(within(menu).getByRole('group', { name: 'Mend' })).toBeInTheDocument();
});

test('Willpower offers no mending', async () => {
	const menu = await openActions('.....', 'willpower', '..//x');

	expect(menuButtons(menu)).toEqual(['Take Damage']);
	expect(within(menu).queryByRole('group', { name: 'Mend' })).not.toBeInTheDocument();
});

test.each([
	['.....', ['Take Damage', 'Superficial (disabled)', 'Aggravated (disabled)']],
	['...//', ['Take Damage', 'Superficial', 'Aggravated (disabled)']],
	['...xx', ['Take Damage', 'Superficial (disabled)', 'Aggravated']],
	['/////', ['Take Damage', 'Superficial', 'Aggravated (disabled)']],
	['xxxxx', ['Take Damage (disabled)', 'Superficial (disabled)', 'Aggravated']]
])('with Health %j, the actions are %j', async (health, expected) => {
	expect(menuButtons(await openActions(health))).toEqual(expected);
});

test.each([
	[
		'health',
		"These changes won't appear in the Chronicle log. To log damage or mending, exit edit mode first."
	],
	[
		'willpower',
		"These changes won't appear in the Chronicle log. To log damage, exit edit mode first."
	]
] as const)('the %s corrections say how to log changes instead', async (track, footnote) => {
	const user = userEvent.setup();
	renderTrack('..//x', track);

	await openControls(user);

	const controls = await screen.findByRole('dialog');
	expect(within(controls).getByText('Make Corrections')).toBeInTheDocument();
	expect(within(controls).getByText(footnote)).toBeInTheDocument();
});

/** Render a track for a character of the given splat, with its actions, and open them. */
const openSplatActions = async (
	splat: Splat,
	track: 'health' | 'willpower',
	onRouse: () => void
): Promise<HTMLElement> => {
	const user = userEvent.setup();
	const char = { ...character('......'), splat };
	render(Tracker, { character: char, track, editing: false, actionable: true, onRouse });
	await user.click(
		screen.getByRole('button', { name: `${track === 'health' ? 'Health' : 'Willpower'} actions` })
	);
	return screen.findByRole('dialog');
};

test("a ghoul's Health menu offers Rouse, which opens the Rouse modal", async () => {
	const user = userEvent.setup();
	const onRouse = vi.fn();
	const menu = await openSplatActions('ghoul', 'health', onRouse);

	await user.click(within(menu).getByRole('button', { name: 'Rouse' }));

	expect(onRouse).toHaveBeenCalledOnce();
});

test.each([
	['vampire', 'health'],
	['ghoul', 'willpower'],
	['mortal', 'health']
] as [Splat, 'health' | 'willpower'][])(
	"a %s's %s menu doesn't offer Rouse",
	async (splat, track) => {
		const menu = await openSplatActions(splat, track, vi.fn());

		expect(within(menu).queryByRole('button', { name: 'Rouse' })).not.toBeInTheDocument();
	}
);
