import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import type { Trait } from '$lib/types';
import TraitColumn from './TraitColumn.svelte';

/** A trait without specialties. */
const trait = (name: string, type: string, rating = 1): Trait => ({
	name,
	rating,
	type,
	subtraits: []
});

const TRAITS: Trait[] = [
	trait('Wits', 'attribute'),
	trait('Stamina', 'attribute'),
	trait('Charisma', 'attribute'),
	trait('Strength', 'attribute'),
	trait('Dexterity', 'attribute'),
	trait('Athletics', 'skill', 0),
	trait('Potence', 'discipline'),
	trait('Celerity', 'discipline')
];

interface Options {
	name?: string;
	cat?: string;
	traits?: Trait[];
	editing?: boolean;
	addable?: boolean;
	addLabel?: string | null;
}

/** Render a column, with `traits` bound to the returned state, as a parent's `bind:` would. */
const renderColumn = ({ traits = TRAITS, editing = true, ...rest }: Options = {}) => {
	const bound = $state({ traits: structuredClone(traits) });
	render(TraitColumn, {
		name: 'physical',
		cat: 'attribute',
		editing,
		allowsSubtraits: false,
		...rest,
		get traits() {
			return bound.traits;
		},
		set traits(next: Trait[]) {
			bound.traits = next;
		}
	});
	return bound;
};

/** The names of the traits shown, in order, read from their first rating dot. */
const shownTraits = (): string[] =>
	screen
		.getAllByRole('button', { name: /: 1 dots$/ })
		.map((button) => button.getAttribute('aria-label')?.replace(/: 1 dots$/, '') ?? '');

/** The input for adding a trait. */
const addInput = (): HTMLElement => screen.getByRole('textbox');

test('shows the column name', () => {
	renderColumn();

	expect(screen.getByRole('heading', { name: 'physical' })).toBeInTheDocument();
});

test('shows attributes and skills in sheet order, only from their subcategory', () => {
	renderColumn();

	expect(shownTraits()).toEqual(['Strength', 'Dexterity', 'Stamina']);
});

test('shows other categories in their given order', () => {
	renderColumn({ name: 'Disciplines', cat: 'discipline' });

	expect(shownTraits()).toEqual(['Potence', 'Celerity']);
});

test('says so when a category is empty', () => {
	renderColumn({ name: 'Custom Traits', cat: 'custom', editing: false });

	expect(screen.getByText('No traits in this category.')).toBeInTheDocument();
});

test("doesn't call an empty category empty while editing", () => {
	renderColumn({ name: 'Custom Traits', cat: 'custom', addable: true });

	expect(screen.queryByText('No traits in this category.')).not.toBeInTheDocument();
});

test.each([
	['when not editing', { editing: false, addable: true }],
	["when the column isn't addable", { editing: true, addable: false }]
])("can't add traits %s", (_case, options) => {
	renderColumn({ name: 'Disciplines', cat: 'discipline', ...options });

	expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Add trait' })).not.toBeInTheDocument();
});

test.each([
	[null, 'discipline', 'Add new Discipline ...'],
	['Custom Trait', 'custom', 'Add new Custom Trait ...']
])('labels the input with %o', (addLabel, cat, placeholder) => {
	renderColumn({ cat, addable: true, addLabel });

	expect(addInput()).toHaveAttribute('placeholder', placeholder);
});

test('adds a trait, in alphabetical order', async () => {
	const user = userEvent.setup();
	const bound = renderColumn({ name: 'Disciplines', cat: 'discipline', addable: true });

	await user.type(addInput(), '  Auspex ');
	await user.click(screen.getByRole('button', { name: 'Add trait' }));

	expect(bound.traits).toContainEqual(trait('Auspex', 'discipline', 1));
	const names = bound.traits.map((t) => t.name);
	expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
	expect(shownTraits()).toEqual(['Auspex', 'Celerity', 'Potence']);
	expect(addInput()).toHaveValue('');
});

test('Enter adds a trait', async () => {
	const user = userEvent.setup();
	const bound = renderColumn({ name: 'Custom Traits', cat: 'custom', addable: true });

	await user.type(addInput(), 'Status{Enter}');

	expect(bound.traits).toContainEqual(trait('Status', 'custom', 1));
});

test('new skills start at 0', async () => {
	const user = userEvent.setup();
	const bound = renderColumn({ name: 'Extra Skills', cat: 'skill', addable: true });

	await user.type(addInput(), 'Archery{Enter}');

	expect(bound.traits).toContainEqual(trait('Archery', 'skill', 0));
});

test.each([
	['A'.repeat(21), 'Maximum 20 characters'],
	['Blood Magic', 'Letters and underscores only'],
	['Willpower', 'Reserved name; set it in Discord instead'],
	['strength', 'Trait already exists']
])('rejects the trait %o', async (name, error) => {
	const user = userEvent.setup();
	const bound = renderColumn({ name: 'Custom Traits', cat: 'custom', addable: true });

	await user.type(addInput(), `${name}{Enter}`);

	expect(screen.getByText(error)).toBeInTheDocument();
	expect(addInput()).toHaveAccessibleDescription(error);
	expect(screen.getByRole('button', { name: 'Add trait' })).toBeDisabled();
	expect(bound.traits).toHaveLength(TRAITS.length);
});

test("can't add a trait without a name", async () => {
	const user = userEvent.setup();
	const bound = renderColumn({ name: 'Custom Traits', cat: 'custom', addable: true });

	await user.type(addInput(), '   ');
	expect(screen.getByRole('button', { name: 'Add trait' })).toBeDisabled();

	await user.keyboard('{Enter}');
	expect(bound.traits).toHaveLength(TRAITS.length);
});
