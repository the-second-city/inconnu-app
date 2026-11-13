import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import type { Advantage } from '$lib/types';
import Advantages from './Advantages.svelte';

type User = ReturnType<typeof userEvent.setup>;

/**
 * Render the Merits and Flaws card, with `advantages` as reactive state so additions and
 * removals are written back to it, as a parent's `bind:` would. Returns that state.
 */
const renderAdvantages = (advantages: Advantage[] = [], editing = true) => {
	const bound = $state({ advantages });
	render(Advantages, {
		editing,
		get advantages() {
			return bound.advantages;
		},
		set advantages(next: Advantage[]) {
			bound.advantages = next;
		}
	});
	return bound;
};

/** The names listed under a heading, in order. */
const listed = (heading: 'Merits' | 'Flaws'): string[] => {
	const group = screen.getByRole('heading', { name: heading }).closest('div')?.parentElement;
	if (!group) throw new Error(`No ${heading} group`);
	return within(group)
		.queryAllByRole('button', { name: /^Remove / })
		.map((button) => (button.getAttribute('aria-label') ?? '').replace(/^Remove /, ''));
};

/**
 * Open the form for adding a merit or flaw. The popover moves focus shortly after opening,
 * which would pull it out of the name field while typing, so wait for that first.
 */
const openForm = async (user: User, type: 'merit' | 'flaw') => {
	const trigger = screen.getByRole('button', { name: `Add ${type}` });
	await user.click(trigger);
	await waitFor(() => expect(trigger).not.toHaveFocus());
};

/** Fill in and submit the add form, which must already be open. */
const add = async (user: User, name: string, rating = 1) => {
	await user.type(await screen.findByRole('textbox', { name: 'Name' }), name);
	await user.selectOptions(screen.getByRole('combobox', { name: 'Rating' }), String(rating));
	await user.click(screen.getByRole('button', { name: 'Add new Advantage' }));
};

const LIBRARY: Advantage = { name: 'Library', type: 'merit', rating: 2 };
const ENEMY: Advantage = { name: 'Enemy', type: 'flaw', rating: 1 };

test('lists merits and flaws under their headings', () => {
	renderAdvantages([LIBRARY, ENEMY]);

	expect(listed('Merits')).toEqual(['Library']);
	expect(listed('Flaws')).toEqual(['Enemy']);
});

test('shows ratings', () => {
	renderAdvantages([LIBRARY], false);

	expect(screen.getByText('Library').parentElement).toHaveTextContent('2');
});

test('has no controls when not editing', () => {
	renderAdvantages([LIBRARY], false);

	expect(screen.queryByRole('button')).not.toBeInTheDocument();
	expect(screen.getByText('Library')).toBeInTheDocument();
	expect(screen.getByText('Add Flaws in edit mode.')).toBeInTheDocument();
});

test('adds a merit, trimmed', async () => {
	const user = userEvent.setup();
	const bound = renderAdvantages();
	await openForm(user, 'merit');

	await add(user, '  Iron_Will ', 3);

	expect(bound.advantages).toEqual([{ name: 'Iron_Will', type: 'merit', rating: 3 }]);
	expect(listed('Merits')).toEqual(['Iron_Will']);
});

test('adds a flaw under Flaws', async () => {
	const user = userEvent.setup();
	renderAdvantages([LIBRARY]);
	await openForm(user, 'flaw');

	await add(user, 'Prey_Exclusion');

	expect(listed('Flaws')).toEqual(['Prey_Exclusion']);
	expect(listed('Merits')).toEqual(['Library']);
});

test('keeps advantages sorted by name', async () => {
	const user = userEvent.setup();
	renderAdvantages([LIBRARY]);
	await openForm(user, 'merit');

	await add(user, 'Allies');

	expect(listed('Merits')).toEqual(['Allies', 'Library']);
});

test('closes the form after adding', async () => {
	const user = userEvent.setup();
	renderAdvantages();
	await openForm(user, 'merit');

	await add(user, 'Allies');

	await waitFor(() =>
		expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument()
	);
});

test.each([
	['an empty name', ''],
	['a name with spaces', 'Iron Will'],
	['a duplicate, ignoring case', 'library']
])("can't add %s", async (_case, name) => {
	const user = userEvent.setup();
	renderAdvantages([LIBRARY]);
	await openForm(user, 'merit');

	const field = await screen.findByRole('textbox', { name: 'Name' });
	if (name) await user.type(field, name);

	expect(screen.getByRole('button', { name: 'Add new Advantage' })).toBeDisabled();
});

test('removes an advantage', async () => {
	const user = userEvent.setup();
	const bound = renderAdvantages([LIBRARY, ENEMY]);

	await user.click(screen.getByRole('button', { name: 'Remove Library' }));

	expect(bound.advantages).toEqual([ENEMY]);
	expect(listed('Merits')).toEqual([]);
});
