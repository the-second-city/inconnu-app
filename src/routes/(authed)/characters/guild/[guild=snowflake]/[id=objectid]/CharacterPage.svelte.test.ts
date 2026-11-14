import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import type { Character, Guild } from '$lib/types';
import CharacterPage from './CharacterPage.svelte';

vi.mock('$app/state', () => ({ page: { data: { session: null } } }));
vi.mock('$app/paths', () => ({ resolve: (route: string) => route }));

const GUILD: Guild = { id: '111', name: 'Camarilla of Chicago', icon: null, count: null };

/** A mortal with a description and one trait. */
const character = (): Character => ({
	_id: 'id',
	name: 'Nadia',
	guild: GUILD.id,
	user: '222',
	splat: 'mortal',
	profile: { description: 'Tall and pale.', biography: null, images: [] },
	health: '......',
	willpower: '.....',
	humanity: 7,
	stains: 0,
	traits: [{ name: 'Strength', rating: 2, type: 'attribute', subtraits: [] }]
});

/** Render the character page, with the character as reactive state. Returns that state. */
const renderPage = () => {
	const bound = $state({ character: character() });
	render(CharacterPage, {
		guild: GUILD,
		get character() {
			return bound.character;
		},
		set character(next: Character) {
			bound.character = next;
		}
	});
	return bound;
};

/** The panel for the selected tab. */
const panel = (): HTMLElement => screen.getByRole('tabpanel');

test('has Sheet and Profile tabs, with Sheet selected', () => {
	renderPage();

	expect(screen.getAllByRole('tab').map((tab) => tab.textContent?.trim())).toEqual([
		'Sheet',
		'Profile'
	]);
	expect(screen.getByRole('tab', { name: 'Sheet' })).toHaveAttribute('aria-selected', 'true');
	expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'false');
});

test('the Sheet tab shows the character sheet', () => {
	renderPage();

	expect(within(panel()).getByText('Strength')).toBeInTheDocument();
	expect(within(panel()).queryByText('Tall and pale.')).not.toBeInTheDocument();
});

test('the Profile tab shows the profile', async () => {
	const user = userEvent.setup();
	renderPage();

	await user.click(screen.getByRole('tab', { name: 'Profile' }));

	expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
	expect(within(panel()).getByText('Tall and pale.')).toBeInTheDocument();
	expect(within(panel()).queryByText('Strength')).not.toBeInTheDocument();
});

test('switches back to the sheet', async () => {
	const user = userEvent.setup();
	renderPage();

	await user.click(screen.getByRole('tab', { name: 'Profile' }));
	await user.click(screen.getByRole('tab', { name: 'Sheet' }));

	expect(within(panel()).getByText('Strength')).toBeInTheDocument();
});

test('arrow keys move between tabs', async () => {
	const user = userEvent.setup();
	renderPage();

	await user.click(screen.getByRole('tab', { name: 'Sheet' }));
	await user.keyboard('{ArrowRight}');

	await waitFor(() => expect(screen.getByRole('tab', { name: 'Profile' })).toHaveFocus());
});

test('editing the profile, then cancelling, restores it', async () => {
	const user = userEvent.setup();
	const bound = renderPage();
	await user.click(screen.getByRole('tab', { name: 'Profile' }));

	await user.click(screen.getByRole('button', { name: 'Edit' }));
	const description = within(panel()).getAllByRole('textbox')[0];
	await user.clear(description);
	await user.type(description, 'Short.');
	expect(bound.character.profile.description).toBe('Short.');

	await user.click(screen.getByRole('button', { name: 'Cancel' }));

	expect(bound.character.profile.description).toBe('Tall and pale.');
	expect(within(panel()).getByText('Tall and pale.')).toBeInTheDocument();
});

test('saving keeps the edits', async () => {
	const user = userEvent.setup();
	const bound = renderPage();
	await user.click(screen.getByRole('tab', { name: 'Profile' }));

	await user.click(screen.getByRole('button', { name: 'Edit' }));
	await user.type(within(panel()).getAllByRole('textbox')[0], ' Scarred.');
	await user.click(screen.getByRole('button', { name: 'Save' }));

	expect(bound.character.profile.description).toBe('Tall and pale. Scarred.');
	expect(within(panel()).queryByRole('textbox')).not.toBeInTheDocument();
});
