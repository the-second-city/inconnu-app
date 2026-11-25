import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import MacroForm from './MacroForm.svelte';
import { PoolPicker, poolPickerContext } from '$lib/state/poolPicker.svelte';
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
	await user.click(screen.getByRole('checkbox', { name: 'Automatic Hunger' }));
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
		difficulty: 3, // One more than the default, 2
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

/** Render the form, `compact` held in state the test can read (as the panel binds it). */
const renderCompactable = () => {
	const state = $state({ compact: false });
	const onsaved = vi.fn();
	render(MacroForm, {
		character: character(),
		oncancel: vi.fn(),
		onsaved,
		get compact() {
			return state.compact;
		},
		set compact(value: boolean) {
			state.compact = value;
		}
	});
	return { state, onsaved };
};

test('Pick traits collapses the form to a strip, keeping what was entered', async () => {
	const user = userEvent.setup();
	const { state } = renderCompactable();
	await user.type(nameField(), 'surge');

	await user.click(screen.getByRole('button', { name: 'Pick traits' }));

	expect(state.compact).toBe(true);
	expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
	const form = screen.getByRole('form', { name: 'New macro' });
	expect(form).toHaveTextContent('surge');
	expect(form).toHaveTextContent('Click traits on the sheet to build the pool.');

	await user.click(screen.getByRole('button', { name: 'Skip pool' }));

	expect(state.compact).toBe(false);
	expect(nameField()).toHaveValue('surge');
});

test("the strip names a macro that's still unnamed", async () => {
	const user = userEvent.setup();
	renderCompactable();

	await user.click(screen.getByRole('button', { name: 'Pick traits' }));

	expect(screen.getByRole('form', { name: 'New macro' })).toHaveTextContent('New Macro');
});

test("the strip's Skip pool returns to the details without adding", async () => {
	const user = userEvent.setup();
	const { state, onsaved } = renderCompactable();
	await user.type(nameField(), 'surge');
	await user.click(screen.getByRole('button', { name: 'More Rouse Checks' }));
	await user.click(screen.getByRole('button', { name: 'Pick traits' }));
	expect(screen.queryByRole('button', { name: 'Add Macro' })).not.toBeInTheDocument();

	await user.click(screen.getByRole('button', { name: 'Skip pool' }));

	expect(state.compact).toBe(false);
	expect(fetchMock).not.toHaveBeenCalled();
	expect(onsaved).not.toHaveBeenCalled();
	expect(addButton()).toBeEnabled();
});

test('a new macro starts at Difficulty 2, named as V5 names it', async () => {
	const user = userEvent.setup();
	renderForm();
	const difficulty = screen.getByRole('group', { name: 'Difficulty' });
	expect(difficulty).toHaveTextContent('2');
	expect(difficulty).toHaveAccessibleDescription('Straightforward');

	await user.click(screen.getByRole('button', { name: 'More Difficulty' }));

	expect(difficulty).toHaveAccessibleDescription('Moderate');
});

/** A macro to edit: Strength + Brawl (Kindred) - Obvious Predator, with every option on. */
const FEED: Macro = {
	name: 'feed',
	pool: ['Strength', '+', 'Brawl.Kindred', '-', 'Obvious Predator'],
	hunger: false,
	difficulty: 4,
	rouses: 1,
	reroll_rouses: true,
	staining: 'apply',
	hunt: true,
	comment: 'Dinner time.'
};

/** Render the form editing `macro` on a vampire with its traits, returning the picker. */
const renderEditing = (macro: Macro = FEED): PoolPicker => {
	const picker = new PoolPicker();
	picker.active = true;
	const char: Character = {
		...character(),
		traits: [
			{ name: 'Strength', rating: 3, type: 'attribute', subtraits: [] },
			{ name: 'Brawl', rating: 2, type: 'skill', subtraits: ['Kindred'] },
			{ name: 'Obvious Predator', rating: 1, type: 'custom', subtraits: [] }
		],
		macros: [existing('blush'), macro, existing('hunt')]
	};
	render(MacroForm, {
		props: { character: char, macro, oncancel: vi.fn(), onsaved: vi.fn() },
		context: poolPickerContext(picker)
	});
	return picker;
};

const saveButton = (): HTMLElement => screen.getByRole('button', { name: 'Save Macro' });

test("editing fills the form from the macro, its pool picked, and saves once there's a change", async () => {
	const user = userEvent.setup();
	const picker = renderEditing();

	expect(screen.getByRole('form', { name: 'Edit feed' })).toBeInTheDocument();
	expect(nameField()).toHaveValue('feed');
	expect(nameField()).toHaveAttribute('aria-invalid', 'false'); // Its own name isn't taken
	expect(screen.getByRole('group', { name: 'Difficulty' })).toHaveAccessibleDescription(
		'Challenging'
	); // 4
	expect(screen.getByRole('checkbox', { name: 'Automatic Hunger' })).not.toBeChecked();
	expect(screen.getByRole('checkbox', { name: 'Hunt' })).toBeChecked();
	expect(screen.getByRole('checkbox', { name: 'Re-roll Rouse failures' })).toBeChecked();
	expect(screen.getByRole('checkbox', { name: 'Oblivion Stains' })).toBeChecked();
	expect(screen.getByRole('textbox', { name: /Comment/ })).toHaveValue('Dinner time.');
	expect(picker.picks.map((pick) => pick.trait)).toEqual(['Strength', 'Brawl', 'Obvious Predator']);
	expect(within(screen.getByRole('list', { name: 'Pool' })).getAllByRole('listitem')).toHaveLength(
		3
	);
	expect(saveButton()).toBeDisabled();

	await user.click(screen.getByRole('button', { name: 'Less Difficulty' }));

	expect(saveButton()).toBeEnabled();
});

test('saving an edit replaces the macro, renamed, keeping the others', async () => {
	const user = userEvent.setup();
	renderEditing();

	await user.clear(nameField());
	await user.type(nameField(), 'drink');
	await user.click(saveButton());

	const init = fetchMock.mock.calls[0][1];
	const sent = (JSON.parse(init?.body as string) as { macros: Macro[] }).macros;
	expect(sent.map((macro) => macro.name)).toEqual(['blush', 'drink', 'hunt']);
	expect(sent[1]).toEqual({ ...FEED, name: 'drink' });
});

test('an edit keeps how the macro shows Stains when it applies none', async () => {
	const user = userEvent.setup();
	renderEditing({ ...FEED, staining: 'no' });
	expect(screen.getByRole('checkbox', { name: 'Oblivion Stains' })).not.toBeChecked();

	await user.click(screen.getByRole('checkbox', { name: 'Hunt' }));
	await user.click(saveButton());

	const init = fetchMock.mock.calls[0][1];
	const sent = (JSON.parse(init?.body as string) as { macros: Macro[] }).macros;
	expect(sent[1].staining).toBe('no');
});

test("a trait the character lacks holds the save until it's removed", async () => {
	const user = userEvent.setup();
	renderEditing({ ...FEED, pool: ['Strength', '+', 'Melee'] });
	await user.click(screen.getByRole('button', { name: 'Less Difficulty' }));

	expect(screen.getByRole('region', { name: 'Pool' })).toHaveTextContent(
		'Melee isn’t on the sheet. Remove it to save.'
	);
	expect(saveButton()).toBeDisabled();

	await user.click(screen.getByRole('button', { name: 'Remove Melee' }));

	expect(saveButton()).toBeEnabled();
});

test('the Modifier adds or subtracts dice beyond the traits, saved as a number', async () => {
	const user = userEvent.setup();
	renderEditing({ ...FEED, pool: ['Strength'] });
	const modifier = screen.getByRole('group', { name: 'Modifier' });
	expect(modifier).toHaveAccessibleDescription('Dice beyond the traits');

	await user.click(screen.getByRole('button', { name: 'Less Modifier' }));
	await user.click(screen.getByRole('button', { name: 'Less Modifier' }));
	expect(modifier).toHaveAccessibleDescription('Subtracts 2 dice');
	expect(within(screen.getByRole('list', { name: 'Pool' })).getAllByRole('listitem')).toHaveLength(
		2
	);
	await user.click(saveButton());

	const init = fetchMock.mock.calls[0][1];
	const sent = (JSON.parse(init?.body as string) as { macros: Macro[] }).macros;
	expect(sent[1].pool).toEqual(['Strength', '-', '2']);
});

test("without a trait to subtract from, the Modifier can't go below 0", async () => {
	const user = userEvent.setup();
	renderEditing({ ...FEED, pool: [] });
	expect(screen.getByRole('button', { name: 'Less Modifier' })).toBeDisabled();

	await user.click(screen.getByRole('button', { name: 'More Modifier' }));

	expect(screen.getByRole('group', { name: 'Modifier' })).toHaveAccessibleDescription('Adds 1 die');
	await user.click(screen.getByRole('button', { name: 'Less Modifier' }));
	expect(screen.getByRole('button', { name: 'Less Modifier' })).toBeDisabled();
});

test("a pool that's all subtracted can't be saved", async () => {
	const user = userEvent.setup();
	renderEditing({ ...FEED, pool: ['Strength', '-', 'Obvious Predator'] });

	await user.click(screen.getByRole('button', { name: 'Remove Strength' }));

	expect(screen.getByRole('region', { name: 'Pool' })).toHaveTextContent(
		'A pool needs something to add.'
	);
	expect(saveButton()).toBeDisabled();
});

test('Add Macro says why it waits, until nothing does', async () => {
	const user = userEvent.setup();
	renderForm();
	expect(addButton()).toHaveAccessibleDescription('Needs a name');

	await user.type(nameField(), 'two words');
	expect(addButton()).toHaveAccessibleDescription('The name needs fixing');

	await user.clear(nameField());
	await user.type(nameField(), 'surge');
	expect(addButton()).toHaveAccessibleDescription('Needs a pool or Rouse Checks');

	await user.click(screen.getByRole('button', { name: 'More Rouse Checks' }));
	expect(addButton()).toBeEnabled();
	expect(addButton()).not.toHaveAccessibleDescription();
});

test('an edit without changes says so', () => {
	renderEditing();

	expect(saveButton()).toHaveAccessibleDescription('No changes yet');
});

test('the Pool heading counts its dice, "?" while a trait is missing', async () => {
	const user = userEvent.setup();
	renderEditing({ ...FEED, pool: ['Strength', '+', 'Melee'] });
	const pool = screen.getByRole('region', { name: 'Pool' });
	expect(pool).toHaveTextContent(/^Pool\s*\? dice/);

	await user.click(screen.getByRole('button', { name: 'Remove Melee' }));

	expect(pool).toHaveTextContent(/^Pool\s*3 dice/);
});

test('with no pool, the strip skips it; with one, it continues', async () => {
	const user = userEvent.setup();
	const picker = new PoolPicker();
	picker.active = true;
	render(MacroForm, {
		props: { character: character(), oncancel: vi.fn(), onsaved: vi.fn(), compact: true },
		context: poolPickerContext(picker)
	});
	expect(screen.getByRole('button', { name: 'Skip pool' })).toBeEnabled();

	picker.modifier = 2;

	expect(await screen.findByRole('button', { name: 'Continue' })).toBeEnabled();
	await user.click(screen.getByRole('button', { name: 'Less Modifier' }));
	await user.click(screen.getByRole('button', { name: 'Less Modifier' }));
	expect(screen.getByRole('button', { name: 'Skip pool' })).toBeInTheDocument();
});
