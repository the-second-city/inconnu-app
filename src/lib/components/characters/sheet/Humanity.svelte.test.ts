import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import type { Character } from '$lib/types';
import Humanity from './Humanity.svelte';

// Constraints come from the character page or wizard; these are the bot's
vi.mock('$lib/constraints', async (original) =>
	(await import('$lib/testing/constraints')).mockConstraints(original)
);

/** A character with the given Humanity and Stains. */
const character = (humanity: number, stains: number): Character => ({
	_id: 'id',
	name: 'Nadia',
	guild: '111',
	user: '222',
	splat: 'vampire',
	profile: { description: null, biography: null, images: [] },
	health: '......',
	willpower: '.....',
	humanity,
	stains,
	traits: []
});

/** The Humanity boxes, in order, by their labels. */
const boxes = (): (string | null)[] =>
	screen.getAllByRole('img').map((box) => box.getAttribute('aria-label'));

/** `count` copies of `label`. */
const times = (count: number, label: string): string[] => Array(count).fill(label);

test('shows Humanity, then empty boxes', () => {
	render(Humanity, { character: character(7, 0), editing: false });

	expect(boxes()).toEqual([...times(7, 'Humanity'), ...times(3, 'Empty')]);
});

test('Stains fill empty boxes from the right', () => {
	render(Humanity, { character: character(7, 2), editing: false });

	expect(boxes()).toEqual([...times(7, 'Humanity'), 'Empty', ...times(2, 'Stain')]);
});

test('Stains beyond the empty boxes overlap Humanity as degeneration', () => {
	render(Humanity, { character: character(8, 4), editing: false });

	expect(boxes()).toEqual([
		...times(6, 'Humanity'),
		...times(2, 'Degeneration'),
		...times(2, 'Stain')
	]);
});

test('always shows 10 boxes', () => {
	render(Humanity, { character: character(10, 3), editing: false });

	expect(boxes()).toHaveLength(10);
});

/**
 * Render Humanity as the character sheet does, with the character as reactive state so edits
 * are written back to it. Returns that state.
 */
const renderHumanity = (humanity: number, stains: number, editing = true) => {
	const bound = $state(character(humanity, stains));
	render(Humanity, { character: bound, editing });
	return bound;
};

/** Open the Humanity controls by clicking the boxes. */
const openControls = async (user: ReturnType<typeof userEvent.setup>) => {
	await user.click(screen.getByRole('button', { name: /^(Humanity|Empty|Degeneration|Stain)/ }));
};

test('the boxes are only a button while editing', () => {
	renderHumanity(7, 0, false);

	expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
	expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('the controls stay closed when editing starts again', async () => {
	const user = userEvent.setup();
	const { rerender } = render(Humanity, { character: character(7, 0), editing: true });
	await openControls(user);
	expect(await screen.findByRole('button', { name: 'More Humanity' })).toBeInTheDocument();

	await rerender({ editing: false });
	await rerender({ editing: true });

	expect(screen.queryByRole('button', { name: 'More Humanity' })).not.toBeInTheDocument();
});

test('changes Humanity and Stains', async () => {
	const user = userEvent.setup();
	const bound = renderHumanity(7, 0);
	await openControls(user);

	await user.click(await screen.findByRole('button', { name: 'Less Humanity' }));
	await user.click(screen.getByRole('button', { name: 'More Stains' }));
	await user.click(screen.getByRole('button', { name: 'More Stains' }));

	expect(bound).toMatchObject({ humanity: 6, stains: 2 });
	expect(boxes()).toEqual([...times(6, 'Humanity'), ...times(2, 'Empty'), ...times(2, 'Stain')]);
});

test('shows a Humanity of 0 as all empty', () => {
	render(Humanity, { character: character(0, 0), editing: false });

	expect(boxes()).toEqual(times(10, 'Empty'));
});

test('Humanity can be lowered to 0', async () => {
	const user = userEvent.setup();
	const bound = renderHumanity(1, 0);
	await openControls(user);

	await user.click(await screen.findByRole('button', { name: 'Less Humanity' }));

	expect(bound.humanity).toBe(0);
	expect(boxes()).toEqual(times(10, 'Empty'));
});

test('Humanity of 0 can be raised to 1', async () => {
	const user = userEvent.setup();
	const bound = renderHumanity(0, 0);
	await openControls(user);

	await user.click(await screen.findByRole('button', { name: 'More Humanity' }));

	expect(bound.humanity).toBe(1);
});

test.each([
	['Less Humanity', 0, 0],
	['More Humanity', 10, 0],
	['Less Stains', 7, 0],
	['More Stains', 7, 10]
])('%s is disabled at its limit', async (name, humanity, stains) => {
	const user = userEvent.setup();
	renderHumanity(humanity, stains);

	await openControls(user);

	expect(await screen.findByRole('button', { name })).toBeDisabled();
});

test("outside edit mode, Humanity's menu offers Apply Stains", async () => {
	const user = userEvent.setup();
	const onStain = vi.fn();
	render(Humanity, { character: character(7, 2), editing: false, onStain });

	await user.click(screen.getByRole('button', { name: 'Humanity actions' }));
	await user.click(
		within(await screen.findByRole('dialog')).getByRole('button', { name: 'Apply Stains' })
	);

	expect(onStain).toHaveBeenCalledOnce();
});

test('at 10 Stains, there are none to apply', async () => {
	const user = userEvent.setup();
	render(Humanity, { character: character(0, 10), editing: false, onStain: vi.fn() });

	await user.click(screen.getByRole('button', { name: 'Humanity actions' }));

	expect(
		within(await screen.findByRole('dialog')).getByRole('button', { name: 'Apply Stains' })
	).toBeDisabled();
});

test("outside edit mode, Humanity's menu offers Remorse, with Stains to test", async () => {
	const user = userEvent.setup();
	const onRemorse = vi.fn();
	render(Humanity, { character: character(7, 2), editing: false, onRemorse });

	await user.click(screen.getByRole('button', { name: 'Humanity actions' }));
	const menu = await screen.findByRole('dialog');
	// Only what's given: here, a Storyteller's Apply Stains isn't
	expect(within(menu).queryByRole('button', { name: 'Apply Stains' })).not.toBeInTheDocument();
	await user.click(within(menu).getByRole('button', { name: 'Remorse' }));

	expect(onRemorse).toHaveBeenCalledOnce();
});

test('without Stains, there is no Remorse to test', async () => {
	const user = userEvent.setup();
	render(Humanity, { character: character(7, 0), editing: false, onRemorse: vi.fn() });

	await user.click(screen.getByRole('button', { name: 'Humanity actions' }));

	expect(
		within(await screen.findByRole('dialog')).getByRole('button', { name: 'Remorse' })
	).toBeDisabled();
});

test("without onStain or onRemorse, Humanity doesn't open a menu", () => {
	render(Humanity, { character: character(7, 2), editing: false });
	expect(screen.queryByRole('button', { name: 'Humanity actions' })).not.toBeInTheDocument();
});

test.each([
	[7, 0, 'Apply Stains', 'No Stains yet'],
	[7, 2, 'Apply Stains', '2 Stains so far'],
	[0, 10, 'Apply Stains', 'Already 10 Stains'],
	[7, 1, 'Remorse', 'Roll 2 dice'],
	[7, 0, 'Remorse', 'No Stains to atone for']
])('at Humanity %i with %i Stains, %s says %j', async (humanity, stains, button, detail) => {
	const user = userEvent.setup();
	render(Humanity, {
		character: character(humanity, stains),
		editing: false,
		onStain: vi.fn(),
		onRemorse: vi.fn()
	});
	await user.click(screen.getByRole('button', { name: 'Humanity actions' }));

	expect(
		within(await screen.findByRole('dialog')).getByRole('button', { name: button })
	).toHaveAccessibleDescription(detail);
});

test.each([
	['the owner', true, 'Apply Stains or test Remorse'],
	["a Storyteller, on a player's character", false, 'Apply Stains']
])("the Humanity menu's hover text lists what %s can do", (_, owner, title) => {
	render(Humanity, {
		character: character(7, 1),
		editing: false,
		onStain: vi.fn(),
		...(owner ? { onRemorse: vi.fn() } : {})
	});
	expect(screen.getByRole('button', { name: 'Humanity actions' })).toHaveAttribute('title', title);
});

test("while editing, Humanity's hover text offers corrections", () => {
	render(Humanity, { character: character(7, 1), editing: true });
	expect(screen.getByTitle('Correct Humanity')).toBeInTheDocument();
});
