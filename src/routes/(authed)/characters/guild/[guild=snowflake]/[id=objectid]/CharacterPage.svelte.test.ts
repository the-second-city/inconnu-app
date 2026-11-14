import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';

import type { Character, Guild } from '$lib/types';
import CharacterPage from './CharacterPage.svelte';

vi.mock('$app/state', () => ({ page: { data: { session: null } } }));
vi.mock('$app/paths', () => ({ resolve: (route: string) => route }));
// SvelteKit's router doesn't run in tests, so write the URL directly
vi.mock('$app/navigation', () => ({
	replaceState: (url: string) => window.history.replaceState({}, '', url)
}));

afterEach(() => window.history.replaceState({}, '', '/'));

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
const renderPage = (char: Character = character()) => {
	const bound = $state({ character: char });
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

/** A character with a log, which gives it a Chronicle tab. */
const characterWithLog = (): Character => ({
	...character(),
	log: {
		created: '2024-03-05T12:00:00',
		left: null,
		deepest_degeneration: 0,
		degenerations: 0,
		frenzy_resisted: 0,
		health_aggravated: 0,
		health_superficial: 0,
		hunger_gained: 0,
		hunger_slaked: 0,
		hunts: 0,
		remorse_checks: 0,
		remorse_failures: 0,
		remorse_successes: 0,
		rouse_checks: 0,
		rouse_failures: 0,
		rouse_successes: 0,
		stains_gained: 5,
		surges: 0,
		times_awakened: 0,
		times_blushed: 0,
		times_frenzied: 0,
		times_slaked: 0,
		willpower_aggravated: 0,
		willpower_superficial: 0,
		incomplete_since: {}
	}
});

test('a character with a log has a Chronicle tab showing it', async () => {
	const user = userEvent.setup();
	renderPage(characterWithLog());

	await user.click(screen.getByRole('tab', { name: 'Chronicle' }));

	expect(within(panel()).getByText('Stains gained')).toBeInTheDocument();
	expect(within(panel()).queryByText('Strength')).not.toBeInTheDocument();
});

/** The name of the selected tab. */
const selectedTab = (): string | undefined =>
	screen
		.getAllByRole('tab')
		.find((tab) => tab.getAttribute('aria-selected') === 'true')
		?.textContent?.trim();

test.each([
	['#profile', 'Profile'],
	['#chronicle', 'Chronicle'],
	['#sheet', 'Sheet'],
	['#nonsense', 'Sheet'],
	['', 'Sheet']
])('the URL hash %j opens the %s tab', async (hash, expected) => {
	window.history.replaceState({}, '', `/${hash}`);
	renderPage(characterWithLog());

	await waitFor(() => expect(selectedTab()).toBe(expected));
});

test('#chronicle opens the sheet when the character has no log', async () => {
	window.history.replaceState({}, '', '/#chronicle');
	renderPage();

	await waitFor(() => expect(selectedTab()).toBe('Sheet'));
});

test('selecting a tab puts it in the URL, and the sheet clears it', async () => {
	const user = userEvent.setup();
	window.history.replaceState({}, '', '/char?x=1');
	renderPage(characterWithLog());

	await user.click(screen.getByRole('tab', { name: 'Chronicle' }));
	expect(window.location.hash).toBe('#chronicle');

	await user.click(screen.getByRole('tab', { name: 'Sheet' }));
	expect(window.location.hash).toBe('');
	expect(window.location.pathname + window.location.search).toBe('/char?x=1');
});

test('changing the URL hash switches tabs', async () => {
	renderPage(characterWithLog());

	window.history.replaceState({}, '', '/#profile');
	await fireEvent(window, new HashChangeEvent('hashchange'));

	expect(selectedTab()).toBe('Profile');
});
