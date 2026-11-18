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
	expect(await screen.findByRole('button', { name: 'More Superficial' })).toBeInTheDocument();

	await rerender({ editing: false });
	await rerender({ editing: true });

	expect(screen.queryByRole('button', { name: 'More Superficial' })).not.toBeInTheDocument();
});

test.each(['health', 'willpower'] as const)(
	'%s has controls for each kind of damage',
	async (track) => {
		const user = userEvent.setup();
		renderTrack('.....', track);

		await openControls(user);

		for (const level of ['Superficial', 'Aggravated', 'Boxes']) {
			expect(await screen.findByRole('button', { name: `More ${level}` })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: `Less ${level}` })).toBeInTheDocument();
		}
	}
);

test('adding damage updates the track and the character', async () => {
	const user = userEvent.setup();
	const bound = renderTrack('.....');
	await openControls(user);

	await user.click(await screen.findByRole('button', { name: 'More Aggravated' }));
	await user.click(screen.getByRole('button', { name: 'More Superficial' }));

	expect(boxes()).toEqual(['Aggravated damage', 'Superficial damage', ...Array(3).fill('Healthy')]);
	expect(bound.health).toBe('.../x');
});

test('damage can be removed only when there is some', async () => {
	const user = userEvent.setup();
	renderTrack('..../');
	await openControls(user);

	expect(await screen.findByRole('button', { name: 'Less Aggravated' })).toBeDisabled();
	await user.click(screen.getByRole('button', { name: 'Less Superficial' }));

	expect(boxes()).toEqual(Array(5).fill('Healthy'));
	expect(screen.getByRole('button', { name: 'Less Superficial' })).toBeDisabled();
});

test('a full track takes no more damage', async () => {
	const user = userEvent.setup();
	renderTrack('xxx');
	await openControls(user);

	expect(await screen.findByRole('button', { name: 'More Aggravated' })).toBeDisabled();
	expect(screen.getByRole('button', { name: 'More Superficial' })).toBeDisabled();
});

test('box controls add and remove boxes', async () => {
	const user = userEvent.setup();
	const bound = renderTrack('.....');
	await openControls(user);

	await user.click(await screen.findByRole('button', { name: 'More Boxes' }));
	expect(boxes()).toHaveLength(6);

	await user.click(screen.getByRole('button', { name: 'Less Boxes' }));
	await user.click(screen.getByRole('button', { name: 'Less Boxes' }));
	expect(boxes()).toHaveLength(4);
	expect(bound.health).toBe('....');
});

test.each([
	['health', 3],
	['willpower', 2]
] as const)('%s keeps at least %i boxes', async (track, min) => {
	const user = userEvent.setup();
	const shortest = '.'.repeat(min);
	render(Tracker, { character: character(shortest, shortest), track, editing: true });
	await openControls(user);

	expect(await screen.findByRole('button', { name: 'Less Boxes' })).toBeDisabled();
	expect(screen.getByRole('button', { name: 'More Boxes' })).toBeEnabled();
});

test.each([
	['health', 25],
	['willpower', 25]
] as const)('%s has at most %i boxes', async (track, max) => {
	const user = userEvent.setup();
	const full = '.'.repeat(max);
	render(Tracker, { character: character(full, full), track, editing: true });
	await openControls(user);

	expect(await screen.findByRole('button', { name: 'More Boxes' })).toBeDisabled();
	expect(screen.getByRole('button', { name: 'Less Boxes' })).toBeEnabled();
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
		actionable: true,
		onMend: vi.fn() // As for the owner, who may heal
	});
	await user.click(
		screen.getByRole('button', { name: `${track === 'health' ? 'Health' : 'Willpower'} actions` })
	);
	return screen.findByRole('dialog');
};

test("without Mend (a Storyteller on a player's character), the menu only deals damage", async () => {
	const user = userEvent.setup();
	render(Tracker, {
		character: character('..//x'),
		track: 'health',
		editing: false,
		actionable: true,
		onTakeDamage: vi.fn()
	});
	await user.click(screen.getByRole('button', { name: 'Health actions' }));

	const menu = await screen.findByRole('dialog');
	expect(within(menu).getByRole('button', { name: 'Take Damage' })).toBeInTheDocument();
	expect(within(menu).queryByRole('group', { name: 'Mend' })).not.toBeInTheDocument();
});

/** The names of a menu's buttons, with "(disabled)" after those that are. */
const menuButtons = (menu: HTMLElement): string[] =>
	within(menu)
		.getAllByRole('button')
		.map(
			(button) =>
				`${button.getAttribute('aria-label')}${button.hasAttribute('disabled') ? ' (disabled)' : ''}`
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

	expect(menuButtons(menu)).toEqual(['Take Damage', 'Mend Superficial', 'Mend Aggravated']);
});

test('Willpower offers mending too', async () => {
	const menu = await openActions('.....', 'willpower', '..//x');

	expect(menuButtons(menu)).toEqual(['Take Damage', 'Mend Superficial', 'Mend Aggravated']);
});

test.each([
	['.....', ['Take Damage', 'Mend Superficial (disabled)', 'Mend Aggravated (disabled)']],
	['...//', ['Take Damage', 'Mend Superficial', 'Mend Aggravated (disabled)']],
	['...xx', ['Take Damage', 'Mend Superficial (disabled)', 'Mend Aggravated']],
	['/////', ['Take Damage', 'Mend Superficial', 'Mend Aggravated (disabled)']],
	['xxxxx', ['Take Damage (disabled)', 'Mend Superficial (disabled)', 'Mend Aggravated']]
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
		"These changes won't appear in the Chronicle log. To log damage or mending, exit edit mode first."
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

test.each([
	['Mend Superficial', 'superficial'],
	['Mend Aggravated', 'aggravated']
] as const)("Health's %s button opens the Mend modal for it", async (button, type) => {
	const user = userEvent.setup();
	const onMend = vi.fn();
	render(Tracker, {
		character: character('..//x'),
		track: 'health',
		editing: false,
		actionable: true,
		onMend
	});
	await user.click(screen.getByRole('button', { name: 'Health actions' }));

	await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: button }));

	expect(onMend).toHaveBeenCalledWith(type, 'health');
});

test("Willpower's Mend buttons open the Mend modal for Willpower", async () => {
	const user = userEvent.setup();
	const onMend = vi.fn();
	render(Tracker, {
		character: character('......', '..//x'),
		track: 'willpower',
		editing: false,
		actionable: true,
		onMend
	});
	await user.click(screen.getByRole('button', { name: 'Willpower actions' }));

	await user.click(
		within(await screen.findByRole('dialog')).getByRole('button', { name: 'Mend Aggravated' })
	);

	expect(onMend).toHaveBeenCalledWith('aggravated', 'willpower');
});

test.each(['health', 'willpower'] as const)(
	"%s's Take Damage opens the damage modal for it",
	async (track) => {
		const user = userEvent.setup();
		const onTakeDamage = vi.fn();
		render(Tracker, {
			character: character('......', '.....'),
			track,
			editing: false,
			actionable: true,
			onTakeDamage
		});
		await user.click(
			screen.getByRole('button', { name: `${track === 'health' ? 'Health' : 'Willpower'} actions` })
		);

		await user.click(
			within(await screen.findByRole('dialog')).getByRole('button', { name: 'Take Damage' })
		);

		expect(onTakeDamage).toHaveBeenCalledWith(track);
	}
);

test.each([
	// [splat, track, health, button, detail]
	['vampire', 'health', '..//x', 'Mend Superficial', 'Costs a Rouse Check'],
	['vampire', 'health', '..//x', 'Mend Aggravated', 'Costs 3 Rouse Checks'],
	['mortal', 'health', '..//x', 'Mend Aggravated', 'Heals without Rousing'],
	['vampire', 'health', '.....', 'Mend Superficial', 'No Superficial damage'],
	['vampire', 'health', 'xxxxx', 'Take Damage', 'Already all Aggravated'],
	['vampire', 'health', '.....', 'Take Damage', 'Superficial or Aggravated']
] as const)("a %s's %s %j menu describes %s: %s", async (splat, track, health, button, detail) => {
	const user = userEvent.setup();
	render(Tracker, {
		character: { ...character(health), splat },
		track,
		editing: false,
		actionable: true,
		onMend: vi.fn()
	});
	await user.click(screen.getByRole('button', { name: 'Health actions' }));

	expect(
		within(await screen.findByRole('dialog')).getByRole('button', { name: button })
	).toHaveAccessibleDescription(detail);
});

test.each(['health', 'willpower'] as const)(
	'the %s corrections name the track under their heading',
	async (track) => {
		const user = userEvent.setup();
		render(Tracker, { character: character('..//x', '..//x'), track, editing: true });
		await openControls(user);

		const popover = await screen.findByRole('dialog');
		const label = track === 'health' ? 'Health' : 'Willpower';
		expect(within(popover).getByText('Make Corrections').nextElementSibling).toHaveTextContent(
			label
		);
	}
);

test.each([
	["the owner's", 'vampire', true, 'Take damage or mend'],
	["a Storyteller's, on a player's character", 'vampire', false, 'Take damage'],
	["a ghoul owner's", 'ghoul', true, 'Take damage, mend, or Rouse']
] as const)("the Health menu's hover text lists %s actions", (_, splat, owner, title) => {
	render(Tracker, {
		character: { ...character('......'), splat },
		track: 'health',
		editing: false,
		actionable: true,
		...(owner ? { onMend: vi.fn(), onRouse: vi.fn() } : {})
	});
	expect(screen.getByRole('button', { name: 'Health actions' })).toHaveAttribute('title', title);
});

test("while editing, the track's hover text offers corrections", () => {
	render(Tracker, { character: character('......'), track: 'willpower', editing: true });
	expect(screen.getByTitle('Correct Willpower')).toBeInTheDocument();
});
