import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { get } from 'svelte/store';
import { beforeEach, expect, test, vi } from 'vitest';

import { creationInfoStore } from '$lib/stores/CreationStore';
import { TEST_CONSTRAINTS } from '$lib/testing/constraints';
import type { Constraints, Trait } from '$lib/types';
import Page from './+page.svelte';
import type { PageData } from './$types';

const goto = vi.hoisted(() => vi.fn());
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

// The wizard's API, for creating the character
const fetchMock = vi.hoisted(() => vi.fn<typeof fetch>());
vi.stubGlobal('fetch', fetchMock);

/** The character the API says it created. */
const CREATED = {
	character_id: 'abc123',
	guild: { id: '111', name: 'Camarilla of Chicago', icon: null, count: null },
	character_name: 'Nadia',
	has_premium: false
};

beforeEach(() => {
	goto.mockReset();
	vi.restoreAllMocks();
	// jsdom doesn't implement alert()
	vi.spyOn(window, 'alert').mockImplementation(() => {});
	fetchMock.mockReset().mockResolvedValue(Response.json(CREATED));
	creationInfoStore.set(null);
});

/** A trait without specialties. */
const trait = (name: string, type: string, rating = 1): Trait => ({
	name,
	rating,
	type,
	subtraits: []
});

/** The wizard data, as its loader returns it, with any fields replaced. */
const wizardData = (fields: Partial<PageData> = {}): PageData =>
	({
		session: null,
		token: 'frivolous-giraffe-wench',
		spc: false,
		guild: CREATED.guild,
		splats: ['vampire', 'mortal', 'ghoul', 'thin-blood'],
		constraints: TEST_CONSTRAINTS,
		traits: [trait('Strength', 'attribute'), trait('Athletics', 'skill', 0)],
		...fields
	}) as PageData;

/** Render the wizard with the given data fields. */
const renderWizard = (fields: Partial<PageData> = {}) => render(Page, { data: wizardData(fields) });

/** The visible, choosable options of a dropdown, by label. */
const optionValues = (label: string): string[] =>
	within(screen.getByRole('combobox', { name: label }))
		.getAllByRole('option')
		.filter((option) => !(option as HTMLOptionElement).disabled)
		.map((option) => (option as HTMLOptionElement).value);

/** Fill in everything the form requires: a name, Health, Willpower, and a template. */
const fillRequired = async (user: UserEvent, splat = 'vampire', name = 'Nadia'): Promise<void> => {
	await user.type(screen.getByRole('textbox', { name: 'Name' }), name);
	await user.selectOptions(screen.getByRole('combobox', { name: 'Health' }), '6');
	await user.selectOptions(screen.getByRole('combobox', { name: 'Willpower' }), '5');
	await user.selectOptions(screen.getByRole('combobox', { name: 'Template' }), splat);
};

/** The JSON body of the creation request. */
const sentPayload = (): Record<string, unknown> => {
	const [, init] = fetchMock.mock.calls[0];
	return JSON.parse(init?.body as string);
};

/** Click Create, whatever name it shows. */
const create = async (user: UserEvent): Promise<void> => {
	await user.click(screen.getByRole('button', { name: /^Create / }));
};

test('says whether it makes a character or an SPC, and on which server', () => {
	renderWizard({ spc: true });

	expect(screen.getByRole('heading', { name: 'New SPC' })).toBeInTheDocument();
	expect(screen.getByText('Camarilla of Chicago')).toBeInTheDocument();
});

test('offers Health, Willpower, and Humanity within the bot’s limits', () => {
	renderWizard();

	expect(optionValues('Health')).toEqual(Array.from({ length: 23 }, (_, i) => `${i + 3}`));
	expect(optionValues('Willpower')).toEqual(Array.from({ length: 24 }, (_, i) => `${i + 2}`));
	// From 1, though the bot allows 0
	expect(optionValues('Humanity')).toEqual(Array.from({ length: 10 }, (_, i) => `${i + 1}`));
	expect(screen.getByRole('combobox', { name: 'Humanity' })).toHaveValue('7');
});

test('follows limits the bot changes', () => {
	const constraints: Constraints = {
		...TEST_CONSTRAINTS,
		trackers: { health: { min: 4, max: 6 }, willpower: { min: 1, max: 3 } },
		conviction_count: 2,
		conviction_max_length: 50,
		profile_max_length: 500
	};
	renderWizard({ constraints });

	expect(optionValues('Health')).toEqual(['4', '5', '6']);
	expect(optionValues('Willpower')).toEqual(['1', '2', '3']);
	expect(screen.getByRole('textbox', { name: 'Convictions' })).toHaveAttribute('maxlength', '100');
	expect(screen.getByRole('textbox', { name: 'Conviction 2' })).toBeInTheDocument();
	expect(screen.queryByRole('textbox', { name: 'Conviction 3' })).not.toBeInTheDocument();
	expect(screen.getByRole('textbox', { name: 'Description' })).toHaveAttribute('maxlength', '1000');
});

test('offers the templates the bot sends', () => {
	renderWizard({ splats: ['vampire', 'thin-blood'] });

	expect(optionValues('Template')).toEqual(['vampire', 'thin-blood']);
	expect(screen.getByRole('option', { name: 'Thin-Blood' })).toBeInTheDocument();
});

test('shows the sheet and Create only once a template is chosen', async () => {
	const user = userEvent.setup();
	renderWizard();

	expect(screen.queryByRole('heading', { name: 'Attributes' })).not.toBeInTheDocument();
	expect(screen.queryByRole('button', { name: /^(Create|Fill out)/ })).not.toBeInTheDocument();

	await user.selectOptions(screen.getByRole('combobox', { name: 'Template' }), 'mortal');

	expect(screen.getByRole('heading', { name: 'Attributes' })).toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'Fill out the form first' })).toBeDisabled();
});

test('Create is enabled, naming the character, once the form is complete', async () => {
	const user = userEvent.setup();
	renderWizard();

	await fillRequired(user, 'vampire', '  Nadia   Theron ');

	expect(screen.getByRole('button', { name: 'Create Nadia Theron' })).toBeEnabled();
});

test.each([
	[
		'Nadia!',
		'Name can only contain letters, numbers, spaces, hyphens, underscores, and apostrophes'
	],
	['a'.repeat(31), 'Name must be 30 characters or less']
])('the name %j is refused: %s', async (name, error) => {
	const user = userEvent.setup();
	renderWizard();

	await fillRequired(user, 'vampire', name);

	expect(screen.getByText(error)).toBeInTheDocument();
	expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(error);
	expect(screen.getByRole('button', { name: 'Fill out the form first' })).toBeDisabled();
});

test('an over-long conviction is refused, but extra spaces don’t count against it', async () => {
	const user = userEvent.setup();
	renderWizard({ constraints: { ...TEST_CONSTRAINTS, conviction_max_length: 10 } });
	await fillRequired(user);
	const conviction = screen.getByRole('textbox', { name: 'Conviction 2' });

	// 11 typed, but 10 once collapsed
	await user.type(conviction, 'Keep  word!');
	expect(conviction).not.toHaveAccessibleDescription();
	expect(screen.getByRole('button', { name: 'Create Nadia' })).toBeEnabled();

	await user.clear(conviction);
	await user.type(conviction, 'Keep words!');
	expect(conviction).toHaveAccessibleDescription('Maximum 10 characters');
	expect(screen.getByRole('button', { name: 'Fill out the form first' })).toBeDisabled();
});

test('a single-code-point emoji counts once against the limit, as the bot counts it', async () => {
	const user = userEvent.setup();
	renderWizard({ constraints: { ...TEST_CONSTRAINTS, profile_max_length: 5 } });
	await fillRequired(user);
	const description = screen.getByRole('textbox', { name: 'Description' });

	// Five code points, though ten UTF-16 code units
	await user.click(description);
	await user.paste('🩸'.repeat(5));
	expect(description).toHaveValue('🩸'.repeat(5));
	expect(description).not.toHaveAccessibleDescription();
	expect(screen.getByRole('button', { name: 'Create Nadia' })).toBeEnabled();
});

test('an over-long description is refused', async () => {
	const user = userEvent.setup();
	renderWizard({ constraints: { ...TEST_CONSTRAINTS, profile_max_length: 5 } });
	await fillRequired(user);

	await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Too tall');

	expect(screen.getByRole('textbox', { name: 'Description' })).toHaveAccessibleDescription(
		'Maximum 5 characters'
	);
	expect(screen.getByRole('button', { name: 'Fill out the form first' })).toBeDisabled();
});

test.each([
	['vampire', 10, 1],
	['thin-blood', 2, 0]
])('a %s has %i Blood Potency dots, starting at %i', async (splat, dots, start) => {
	const user = userEvent.setup();
	renderWizard();

	await user.selectOptions(screen.getByRole('combobox', { name: 'Template' }), splat);

	expect(screen.getAllByRole('button', { name: /^Blood Potency: \d+ dots$/ })).toHaveLength(dots);
	await fillRequired(user, splat);
	await create(user);
	expect(sentPayload().blood_potency).toBe(start);
});

test('mortals and ghouls have no Blood Potency', async () => {
	const user = userEvent.setup();
	renderWizard();

	await user.selectOptions(screen.getByRole('combobox', { name: 'Template' }), 'vampire');
	await user.click(screen.getByRole('button', { name: 'Blood Potency: 3 dots' }));
	await fillRequired(user, 'ghoul');

	expect(screen.queryByRole('heading', { name: 'Blood Potency' })).not.toBeInTheDocument();
	await create(user);
	expect(sentPayload().blood_potency).toBe(0);
});

test('switching templates resets Blood Potency', async () => {
	const user = userEvent.setup();
	renderWizard();
	await fillRequired(user, 'vampire');

	await user.click(screen.getByRole('button', { name: 'Blood Potency: 4 dots' }));
	await user.selectOptions(screen.getByRole('combobox', { name: 'Template' }), 'thin-blood');
	await user.selectOptions(screen.getByRole('combobox', { name: 'Template' }), 'vampire');
	await create(user);

	expect(sentPayload().blood_potency).toBe(1);
});

test('choosing mortal drops the disciplines', async () => {
	const user = userEvent.setup();
	renderWizard({ traits: [trait('Strength', 'attribute'), trait('Auspex', 'discipline')] });

	await fillRequired(user, 'vampire');
	expect(screen.getByRole('heading', { name: 'Disciplines' })).toBeInTheDocument();
	await user.selectOptions(screen.getByRole('combobox', { name: 'Template' }), 'mortal');
	await create(user);

	expect(screen.queryByRole('heading', { name: 'Disciplines' })).not.toBeInTheDocument();
	expect((sentPayload().traits as Trait[]).map((t) => t.name)).toEqual(['Strength']);
});

test('sends the character, with its text collapsed, then shows the success page', async () => {
	const user = userEvent.setup();
	renderWizard();
	await fillRequired(user, 'vampire', ' Nadia ');
	await user.selectOptions(screen.getByRole('combobox', { name: 'Humanity' }), '6');
	await user.type(
		screen.getByRole('textbox', { name: 'Convictions' }),
		'  Never   betray a friend '
	);
	await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Tall.\n\nPale.');
	await user.type(screen.getByRole('textbox', { name: 'History' }), 'Embraced in 1920.');
	await user.click(screen.getByRole('button', { name: 'Blood Potency: 2 dots' }));

	await create(user);

	const [url, init] = fetchMock.mock.calls[0];
	expect(url).toBe('/api/wizard/frivolous-giraffe-wench');
	expect(init?.method).toBe('POST');
	expect(sentPayload()).toEqual({
		name: 'Nadia',
		splat: 'vampire',
		health: 6,
		willpower: 5,
		humanity: 6,
		blood_potency: 2,
		convictions: ['Never betray a friend', '', ''],
		// The bot's names: History is its biography; the description keeps its newlines
		biography: 'Embraced in 1920.',
		description: 'Tall.\n\nPale.',
		traits: [trait('Strength', 'attribute'), trait('Athletics', 'skill', 0)]
	});
	await waitFor(() => expect(goto).toHaveBeenCalledWith('/wizard/success'));
	expect(get(creationInfoStore)).toEqual(CREATED);
});

test('sends trait changes made on the sheet', async () => {
	const user = userEvent.setup();
	renderWizard();
	await fillRequired(user, 'vampire');

	await user.click(screen.getByRole('button', { name: 'Strength: 3 dots' }));
	await user.type(screen.getByRole('textbox', { name: 'New Discipline' }), 'Blood Sorcery{Enter}');
	await create(user);

	const traits = sentPayload().traits as Trait[];
	expect(traits).toContainEqual(trait('Strength', 'attribute', 3));
	expect(traits).toContainEqual(trait('Blood Sorcery', 'discipline', 1));
});

test('says it’s creating while the request runs', async () => {
	const user = userEvent.setup();
	let answer: (response: Response) => void = () => {};
	fetchMock.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
	renderWizard();
	await fillRequired(user);

	await create(user);

	const button = screen.getByRole('button', { name: 'Creating...' });
	expect(button).toBeDisabled();
	expect(button).toHaveAttribute('aria-busy', 'true');
	answer(Response.json(CREATED));
	await waitFor(() => expect(goto).toHaveBeenCalledWith('/wizard/success'));
});

test('an expired wizard says so, and goes back to the explainer', async () => {
	const user = userEvent.setup();
	fetchMock.mockResolvedValue(Response.json({ detail: 'Not found' }, { status: 404 }));
	renderWizard();
	await fillRequired(user);

	await create(user);

	await waitFor(() => expect(goto).toHaveBeenCalledWith('/wizard'));
	expect(window.alert).toHaveBeenCalledWith(
		'This wizard has expired. Please run the command again in Discord.'
	);
	expect(get(creationInfoStore)).toBeNull();
});

test('a refusal shows the bot’s reason, and keeps the form to fix', async () => {
	const user = userEvent.setup();
	fetchMock.mockResolvedValue(
		Response.json({ detail: "There's already a character named `Nadia`." }, { status: 400 })
	);
	renderWizard();
	await fillRequired(user);

	await create(user);

	await waitFor(() =>
		expect(window.alert).toHaveBeenCalledWith("There's already a character named `Nadia`.")
	);
	expect(goto).not.toHaveBeenCalled();
	expect(screen.getByRole('button', { name: 'Create Nadia' })).toBeEnabled();
	expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Nadia');
});

test('a failed request says to try again, and keeps the form', async () => {
	const user = userEvent.setup();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	fetchMock.mockRejectedValue(new TypeError('fetch failed'));
	renderWizard();
	await fillRequired(user);

	await create(user);

	await waitFor(() =>
		expect(window.alert).toHaveBeenCalledWith('An unexpected error occurred. Please try again.')
	);
	expect(goto).not.toHaveBeenCalled();
	expect(screen.getByRole('button', { name: 'Create Nadia' })).toBeEnabled();
});
