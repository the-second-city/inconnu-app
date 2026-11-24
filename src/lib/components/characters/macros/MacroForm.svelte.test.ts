import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import MacroForm from './MacroForm.svelte';
import type { Character, Macro, Splat } from '$lib/types';

vi.mock('$app/paths', () => ({
	resolve: (route: string, params: { id: string }) => route.replace('[id=objectid]', params.id)
}));
vi.mock('$lib/constraints', async (original) =>
	(await import('$lib/testing/constraints')).mockConstraints(original)
);
// No busy delay: the save's own promise decides when it's done
vi.mock('$lib/state/busy', () => ({ atLeast: <T>(work: Promise<T>): Promise<T> => work }));

const fetchMock = vi.hoisted(() => vi.fn<typeof fetch>());
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
	fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
});

/** A macro named `name` that makes one Rouse Check. */
const existing = (name: string): Macro => ({
	name,
	pool: [],
	hunger: true,
	difficulty: 0,
	rouses: 1,
	reroll_rouses: false,
	staining: 'show',
	hunt: false,
	comment: null
});

/** A character of the splat, with a "hunt" and a "blush" macro. */
const character = (splat: Splat = 'vampire'): Character => ({
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
	potency: 1,
	hunger: 1,
	traits: [],
	macros: [existing('blush'), existing('hunt')]
});

/** Render the form, returning its callbacks. */
const renderForm = (splat: Splat = 'vampire') => {
	const oncancel = vi.fn();
	const onsaved = vi.fn();
	render(MacroForm, { character: character(splat), oncancel, onsaved });
	return { oncancel, onsaved };
};

const nameField = (): HTMLElement => screen.getByRole('textbox', { name: 'Name' });
const addButton = (): HTMLElement => screen.getByRole('button', { name: 'Add Macro' });

test('focuses the name, and asks for traits to build the pool', () => {
	renderForm();

	expect(nameField()).toHaveFocus();
	expect(screen.getByRole('region', { name: 'Pool' })).toHaveTextContent(
		'Click traits on the sheet to build the pool.'
	);
	expect(addButton()).toBeDisabled();
});

test.each([
	['two words', 'Name can only contain letters and underscores, with at least one letter'],
	['HUNT', "There's already a macro named HUNT"]
])('the name %j is invalid: %s', async (name, error) => {
	const user = userEvent.setup();
	renderForm();

	await user.type(nameField(), name);

	expect(nameField()).toHaveAccessibleDescription(error);
	expect(nameField()).toHaveAttribute('aria-invalid', 'true');
});

test('a macro needs a pool or Rouse Checks', async () => {
	const user = userEvent.setup();
	renderForm();

	await user.type(nameField(), 'surge');
	expect(addButton()).toBeDisabled();

	await user.click(screen.getByRole('button', { name: 'More Rouse Checks' }));
	expect(addButton()).toBeEnabled();
});

test('the Rouse options wait for Rouse Checks', async () => {
	const user = userEvent.setup();
	renderForm();
	const reroll = screen.getByRole('checkbox', { name: 'Re-roll Rouse failures' });
	const stains = screen.getByRole('checkbox', { name: 'Oblivion Stains' });
	expect(reroll).toBeDisabled();
	expect(stains).toBeDisabled();

	await user.click(screen.getByRole('button', { name: 'More Rouse Checks' }));

	expect(reroll).toBeEnabled();
	expect(stains).toBeEnabled();
});

test("a ghoul's macro can Rouse, but has no vampire's options", () => {
	renderForm('ghoul');

	expect(screen.getByRole('group', { name: 'Rouse Checks' })).toBeInTheDocument();
	expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

test("a mortal's macro has only a Difficulty", () => {
	renderForm('mortal');

	expect(screen.getByRole('group', { name: 'Difficulty' })).toBeInTheDocument();
	expect(screen.queryByRole('group', { name: 'Rouse Checks' })).not.toBeInTheDocument();
	expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

test('a comment too long for the bot holds the macro', async () => {
	const user = userEvent.setup();
	renderForm();
	await user.type(nameField(), 'surge');
	await user.click(screen.getByRole('button', { name: 'More Rouse Checks' }));

	const comment = screen.getByRole('textbox', { name: /Comment/ });
	await user.click(comment);
	await user.paste('x'.repeat(301));

	expect(comment).toHaveAccessibleDescription('Maximum 300 characters');
	expect(addButton()).toBeDisabled();
});

test('adding saves all the macros, sorted, with the new one', async () => {
	const user = userEvent.setup();
	const { onsaved } = renderForm();

	await user.type(nameField(), ' Feed ');
	await user.click(screen.getByRole('button', { name: 'More Difficulty' }));
	await user.click(screen.getByRole('button', { name: 'More Rouse Checks' }));
	await user.click(screen.getByRole('button', { name: 'More Rouse Checks' }));
	await user.click(screen.getByRole('checkbox', { name: 'Hunger dice' }));
	await user.click(screen.getByRole('checkbox', { name: 'Hunt' }));
	await user.click(screen.getByRole('checkbox', { name: 'Re-roll Rouse failures' }));
	await user.click(screen.getByRole('checkbox', { name: 'Oblivion Stains' }));
	await user.type(screen.getByRole('textbox', { name: /Comment/ }), ' Dinner time. ');
	await user.click(addButton());

	expect(fetchMock).toHaveBeenCalledOnce();
	const [url, init] = fetchMock.mock.calls[0];
	expect(url).toBe('/api/characters/abc/macros');
	expect(init?.method).toBe('PATCH');
	const sent = (JSON.parse(init?.body as string) as { macros: Macro[] }).macros;
	expect(sent.map((macro) => macro.name)).toEqual(['blush', 'Feed', 'hunt']);
	expect(sent[1]).toEqual({
		name: 'Feed',
		pool: [],
		hunger: false,
		difficulty: 1,
		rouses: 2,
		reroll_rouses: true,
		staining: 'apply',
		hunt: true,
		comment: 'Dinner time.'
	});
	expect(onsaved).toHaveBeenCalledOnce();
});

test('a Rouse option stays chosen while the Rouse Checks go to 0 and back', async () => {
	const user = userEvent.setup();
	renderForm();
	await user.type(nameField(), 'surge');
	await user.click(screen.getByRole('button', { name: 'More Rouse Checks' }));
	await user.click(screen.getByRole('checkbox', { name: 'Re-roll Rouse failures' }));
	await user.click(screen.getByRole('button', { name: 'More Rouse Checks' }));
	await user.click(screen.getByRole('button', { name: 'Less Rouse Checks' }));
	await user.click(screen.getByRole('button', { name: 'Less Rouse Checks' }));
	// No pool and no Rouses: not addable; one Rouse back, and re-rolling is still chosen
	expect(addButton()).toBeDisabled();
	await user.click(screen.getByRole('button', { name: 'More Rouse Checks' }));
	await user.click(addButton());

	const sent = (JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as { macros: Macro[] })
		.macros;
	expect(sent.find((macro) => macro.name === 'surge')).toMatchObject({
		rouses: 1,
		reroll_rouses: true,
		comment: null
	});
});

test('a failed save shows why, keeping the form', async () => {
	fetchMock.mockResolvedValueOnce(
		Response.json({ detail: [{ msg: 'Value error, Bad pool.' }] }, { status: 422 })
	);
	const user = userEvent.setup();
	const { onsaved } = renderForm();
	await user.type(nameField(), 'surge');
	await user.click(screen.getByRole('button', { name: 'More Rouse Checks' }));
	await user.click(addButton());

	expect(await screen.findByRole('alert')).toHaveTextContent('Bad pool.');
	expect(nameField()).toHaveValue('surge');
	expect(onsaved).not.toHaveBeenCalled();
});

test('Cancel calls back without saving', async () => {
	const user = userEvent.setup();
	const { oncancel } = renderForm();

	await user.click(screen.getByRole('button', { name: 'Cancel' }));

	expect(oncancel).toHaveBeenCalledOnce();
	expect(fetchMock).not.toHaveBeenCalled();
});
