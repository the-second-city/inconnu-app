import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import type { Character, Splat } from '$lib/types';
import BloodTrackers from './BloodTrackers.svelte';

/** A vampire with the given blood fields. */
const vampire = (fields: Partial<Character> = {}, splat: Splat = 'vampire'): Character => ({
	_id: 'id',
	name: 'Nadia',
	guild: '111',
	user: '222',
	splat,
	profile: { description: null, biography: null, images: [] },
	health: '......',
	willpower: '.....',
	humanity: 7,
	stains: 0,
	traits: [],
	...fields
});

/** The rendered Blood Potency dots. */
const potencyDots = (): Element[] =>
	Array.from(screen.getByRole('img', { name: /^Blood Potency/ }).children);

test.each([
	['vampire', 10],
	['thin-blood', 2]
] as [Splat, number][])('a %s has %i Blood Potency dots', (splat, dots) => {
	render(BloodTrackers, { character: vampire({ blood_potency: 1 }, splat) });

	expect(potencyDots()).toHaveLength(dots);
});

test('shows Blood Potency', () => {
	render(BloodTrackers, { character: vampire({ blood_potency: 3 }) });

	expect(screen.getByRole('img', { name: 'Blood Potency 3' })).toBeInTheDocument();
});

test('prefers potency over blood_potency', () => {
	render(BloodTrackers, { character: vampire({ potency: 4, blood_potency: 2 }) });

	expect(screen.getByRole('img', { name: 'Blood Potency 4' })).toBeInTheDocument();
});

test('Blood Potency defaults to 0', () => {
	render(BloodTrackers, { character: vampire() });

	expect(screen.getByRole('img', { name: 'Blood Potency 0' })).toBeInTheDocument();
});

test.each([0, 2, 5])('shows %i Hunger of 5', (hunger) => {
	render(BloodTrackers, { character: vampire({ hunger }) });

	expect(screen.queryAllByRole('img', { name: 'Hunger' })).toHaveLength(hunger);
	expect(screen.queryAllByRole('img', { name: 'No hunger' })).toHaveLength(5 - hunger);
});

/** Render the trackers in edit mode, bound to a `$state` character so its writes show. Returns
 * the character. */
const renderEditing = (fields: Partial<Character> = {}, splat: Splat = 'vampire'): Character => {
	const character = $state(vampire(fields, splat));
	render(BloodTrackers, { character, editing: true });
	return character;
};

test('the pips are only buttons while editing', () => {
	render(BloodTrackers, { character: vampire({ potency: 2, hunger: 1 }) });

	expect(screen.queryAllByRole('button')).toHaveLength(0);
});

test('clicking a Hunger drop sets Hunger', async () => {
	const user = userEvent.setup();
	const character = renderEditing({ hunger: 1 });

	await user.click(screen.getByRole('button', { name: 'Set Hunger to 4' }));

	expect(character.hunger).toBe(4);
	expect(screen.getByRole('group', { name: 'Hunger: 4 of 5' })).toBeInTheDocument();
});

test('clicking the only Hunger drop empties it', async () => {
	const user = userEvent.setup();
	const character = renderEditing({ hunger: 1 });

	await user.click(screen.getByRole('button', { name: 'Set Hunger to 1' }));

	expect(character.hunger).toBe(0);
});

test('clicking a Blood Potency dot sets potency', async () => {
	const user = userEvent.setup();
	const character = renderEditing({ potency: 2 });

	await user.click(screen.getByRole('button', { name: 'Set Blood Potency to 5' }));

	expect(character.potency).toBe(5);
});

test.each([
	['vampire', 1],
	['thin-blood', 0]
] as [Splat, number][])("a %s's Blood Potency goes no lower than %i", async (splat, min) => {
	const user = userEvent.setup();
	const character = renderEditing({ potency: 1 }, splat);

	await user.click(screen.getByRole('button', { name: 'Set Blood Potency to 1' }));

	expect(character.potency).toBe(min);
});

test('a vampire at Blood Potency 0 (set in Discord) can return to 0 after a stray click', async () => {
	const user = userEvent.setup();
	const character = renderEditing({ potency: 0 });

	await user.click(screen.getByRole('button', { name: 'Set Blood Potency to 1' }));
	expect(character.potency).toBe(1);
	await user.click(screen.getByRole('button', { name: 'Set Blood Potency to 1' }));

	expect(character.potency).toBe(0);
});

/** Render the trackers at a Hunger, with Rouse and Slake, and open the Hunger menu. */
const openHungerMenu = async (
	hunger: number,
	onRouse = vi.fn(),
	onSlake = vi.fn()
): Promise<HTMLElement> => {
	const user = userEvent.setup();
	render(BloodTrackers, { character: vampire({ hunger }), onRouse, onSlake });
	await user.click(screen.getByRole('button', { name: 'Hunger actions' }));
	return screen.findByRole('dialog');
};

test.each([
	['Rouse', 'onRouse'],
	['Slake', 'onSlake']
] as const)("outside edit mode, Hunger's menu offers %s", async (action, prop) => {
	const user = userEvent.setup();
	const callbacks = { onRouse: vi.fn(), onSlake: vi.fn() };
	const menu = await openHungerMenu(2, callbacks.onRouse, callbacks.onSlake);

	await user.click(within(menu).getByRole('button', { name: action }));

	expect(callbacks[prop]).toHaveBeenCalledOnce();
});

test('at Hunger 0, there is nothing to slake', async () => {
	const menu = await openHungerMenu(0);

	expect(within(menu).getByRole('button', { name: 'Slake' })).toBeDisabled();
	expect(within(menu).getByRole('button', { name: 'Rouse' })).toBeEnabled();
});

test("while editing, Hunger doesn't open a menu", () => {
	render(BloodTrackers, { character: vampire({ hunger: 2 }), editing: true, onRouse: vi.fn() });
	expect(screen.queryByRole('button', { name: 'Hunger actions' })).not.toBeInTheDocument();
});

test("without Rouse or Slake, Hunger doesn't open a menu", () => {
	render(BloodTrackers, { character: vampire({ hunger: 2 }) });
	expect(screen.queryByRole('button', { name: 'Hunger actions' })).not.toBeInTheDocument();
});

test.each([
	[2, 'Rouse', 'Hunger may rise'],
	[5, 'Rouse', 'At Hunger 5, a failure risks frenzy'],
	[2, 'Slake', 'Feed to lower Hunger'],
	[0, 'Slake', 'No Hunger to slake']
])('at Hunger %i, %s says %j', async (hunger, button, detail) => {
	const user = userEvent.setup();
	render(BloodTrackers, { character: vampire({ hunger }), onRouse: vi.fn(), onSlake: vi.fn() });
	await user.click(screen.getByRole('button', { name: 'Hunger actions' }));

	expect(
		within(await screen.findByRole('dialog')).getByRole('button', { name: button })
	).toHaveAccessibleDescription(detail);
});

test("the Hunger menu's hover text lists its actions", () => {
	render(BloodTrackers, { character: vampire({ hunger: 2 }), onRouse: vi.fn(), onSlake: vi.fn() });
	expect(screen.getByRole('button', { name: 'Hunger actions' })).toHaveAttribute(
		'title',
		'Rouse or slake'
	);
});
