import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import RatingSelector from './RatingSelector.svelte';
import { PoolPicker, poolPickerContext } from '$lib/state/poolPicker.svelte';
import { SheetHighlight, sheetHighlightContext } from '$lib/state/sheetHighlight.svelte';

vi.mock('$lib/constraints', async (original) =>
	(await import('$lib/testing/constraints')).mockConstraints(original)
);

interface Options {
	name?: string;
	subtraits?: string[];
	type?: string;
	editing?: boolean;
	active?: boolean;
	highlight?: SheetHighlight; // The sheet's highlight of a hovered macro's traits
}

/**
 * Render a trait's rating (Brawl 3, with specialties, by default) on a sheet with a pool picker (and
 * a sheet highlight), returning the picker.
 */
const renderTrait = ({
	name = 'Brawl',
	subtraits = ['Kindred', 'Street Fighting'],
	type = 'skill',
	editing = false,
	active = true,
	highlight = new SheetHighlight()
}: Options = {}): PoolPicker => {
	const picker = new PoolPicker();
	picker.active = active;
	render(RatingSelector, {
		props: { name, rating: 3, subtraits, type, editing, allowsSubtraits: true },
		context: new Map<symbol, unknown>([
			...poolPickerContext(picker),
			...sheetHighlightContext(highlight)
		])
	});
	return picker;
};

/** The line of a trait with specialties, which opens its menu. */
const line = (name = 'Brawl'): HTMLElement =>
	screen.getByRole('button', { name: `${name}: pick for the pool` });

/** The menu's rows, as "label (checked)": the line's own row by its name, then the specialties. */
const rowLabels = (): string[] =>
	within(screen.getByRole('menu'))
		.getAllByRole('menuitemradio')
		.map(
			(row) =>
				`${row.getAttribute('aria-label') ?? row.textContent?.replace(/\s+/g, ' ').trim()}${row.getAttribute('aria-checked') === 'true' ? ' ✓' : ''}`
		);

test('a trait without specialties is picked, and dropped, by clicking its line', async () => {
	const user = userEvent.setup();
	const picker = renderTrait({ name: 'Strength', subtraits: [], type: 'attribute' });
	const button = screen.getByRole('button', { name: 'Pick Strength' });
	expect(button).toHaveAttribute('aria-pressed', 'false');

	await user.click(button);
	expect(picker.picks).toEqual([{ trait: 'Strength', specialty: null, negative: false }]);
	expect(button).toHaveAttribute('aria-pressed', 'true');

	await user.click(button);
	expect(picker.picks).toEqual([]);
	expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

test('hovering a trait with specialties opens its menu: the line itself, then each specialty', async () => {
	const user = userEvent.setup();
	renderTrait();

	await user.hover(line());

	await screen.findByRole('menu', { name: 'Brawl' });
	expect(rowLabels()).toEqual(['Brawl', 'Kindred +1', 'Street Fighting +1']);
	expect(line()).toHaveAttribute('aria-expanded', 'true');
});

test('leaving the line and the menu closes it', async () => {
	const user = userEvent.setup();
	renderTrait();
	await user.hover(line());
	const menu = await screen.findByRole('menu');

	await user.hover(menu); // Crossing to the menu keeps it
	await new Promise((resolve) => setTimeout(resolve, 250));
	expect(screen.getByRole('menu')).toBeInTheDocument();

	await user.unhover(menu);
	await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
});

test('picking a specialty picks the trait with it; picking it again drops the trait', async () => {
	const user = userEvent.setup();
	const picker = renderTrait();

	await user.click(line()); // A click (or tap) opens it too
	await user.click(screen.getByRole('menuitemradio', { name: /Kindred/ }));

	expect(picker.picks).toEqual([{ trait: 'Brawl', specialty: 'Kindred', negative: false }]);
	await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

	await user.click(line());
	expect(rowLabels()).toEqual(['Brawl', 'Kindred +1 ✓', 'Street Fighting +1']);
	await user.click(screen.getByRole('menuitemradio', { name: /Kindred/ }));
	expect(picker.picks).toEqual([]);
});

test('picking the trait itself picks it without a specialty, switching from one', async () => {
	const user = userEvent.setup();
	const picker = renderTrait();
	picker.pick('Brawl', 'Kindred');

	await user.click(line());
	await user.click(screen.getByRole('menuitemradio', { name: 'Brawl' }));

	expect(picker.picks).toEqual([{ trait: 'Brawl', specialty: null, negative: false }]);
});

test("a Discipline's powers add no dice", async () => {
	const user = userEvent.setup();
	renderTrait({ name: 'Potence', subtraits: ['Lethal Body'], type: 'discipline' });

	await user.click(line('Potence'));

	expect(rowLabels()).toEqual(['Potence', 'Lethal Body']);
});

test('the keyboard opens the menu on its first row, moves with arrows, and Escape returns', async () => {
	const user = userEvent.setup();
	renderTrait();
	line().focus();

	await user.keyboard('{Enter}');
	const rows = within(await screen.findByRole('menu')).getAllByRole('menuitemradio');
	await waitFor(() => expect(rows[0]).toHaveFocus());

	await user.keyboard('{ArrowDown}');
	expect(rows[1]).toHaveFocus();
	await user.keyboard('{ArrowUp}{ArrowUp}');
	expect(rows[2]).toHaveFocus(); // Wraps around

	await user.keyboard('{Escape}');
	await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
	expect(line()).toHaveFocus();
});

test('choosing with the keyboard returns focus to the line', async () => {
	const user = userEvent.setup();
	const picker = renderTrait();
	line().focus();

	await user.keyboard('{Enter}');
	const rows = within(await screen.findByRole('menu')).getAllByRole('menuitemradio');
	await waitFor(() => expect(rows[0]).toHaveFocus());
	await user.keyboard('{ArrowDown}{Enter}');

	expect(picker.picks).toEqual([{ trait: 'Brawl', specialty: 'Kindred', negative: false }]);
	expect(line()).toHaveFocus();
});

test('clicking elsewhere closes the menu', async () => {
	const user = userEvent.setup();
	renderTrait();
	await user.click(line());
	expect(screen.getByRole('menu')).toBeInTheDocument();

	await user.click(document.body);

	await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
});

test.each([
	['not picking', { active: false }],
	['editing', { editing: true }]
])("the line isn't a choice when %s", (_, options: Options) => {
	renderTrait(options);

	expect(screen.queryByRole('button', { name: /pick for the pool/ })).not.toBeInTheDocument();
});

test("a subtracted trait's line is marked as picked, and still drops on a click", async () => {
	const user = userEvent.setup();
	const picker = renderTrait({ name: 'Obvious Predator', subtraits: [], type: 'custom' });
	picker.pick('Strength', null);
	picker.pick('Obvious Predator', null);
	picker.flip('Obvious Predator');
	const button = screen.getByRole('button', { name: 'Pick Obvious Predator' });
	await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));

	await user.click(button);

	expect(picker.selection('Obvious Predator')).toBeUndefined();
});

/** The trait's line, outside picking: the element holding its name. */
const plainLine = (name = 'Brawl'): HTMLElement | null =>
	screen.getByText(name).closest('.trait-line');

test.each([
	[false, 'added'],
	[true, 'subtracted']
])("a hovered macro's trait is highlighted on the sheet (negative: %s)", async (negative, mark) => {
	const highlight = new SheetHighlight();
	renderTrait({ active: false, highlight });
	expect(plainLine()).not.toHaveAttribute('data-highlight');

	highlight.picks = [{ trait: 'Brawl', specialty: null, negative }];

	await waitFor(() => expect(plainLine()).toHaveAttribute('data-highlight', mark));
	highlight.hide();
	await waitFor(() => expect(plainLine()).not.toHaveAttribute('data-highlight'));
});

test("editing doesn't highlight", () => {
	const highlight = new SheetHighlight();
	renderTrait({ active: false, editing: true, highlight });
	highlight.picks = [{ trait: 'Brawl', specialty: null, negative: false }];

	expect(document.querySelector('[data-highlight]')).toBeNull();
});
