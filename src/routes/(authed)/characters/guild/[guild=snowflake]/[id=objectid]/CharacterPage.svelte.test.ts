import { render, screen, waitFor, within, type RenderResult } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { flushSync } from 'svelte';
import { beforeEach, expect, test, vi } from 'vitest';

import type { Character, Guild } from '$lib/types';
import { navigate, page } from '$lib/testing/page.svelte';
import CharacterPage from './CharacterPage.svelte';

// SvelteKit's router doesn't run in tests: `page` is reactive state, which `goto` updates
const goto = vi.hoisted(() => vi.fn());
vi.mock('$app/state', () => import('$lib/testing/page.svelte'));
vi.mock('$app/paths', () => ({ resolve: (route: string) => route }));
vi.mock('$app/navigation', () => ({ goto }));

beforeEach(() => {
	navigate('http://localhost/');
	goto.mockReset().mockImplementation(async (url: string) => navigate(url));
});

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

/** Render the character page, with its edit buttons. Returns the render result, whose `rerender`
 * changes its props. */
const renderPage = (char: Character = character()): RenderResult<typeof CharacterPage> =>
	render(CharacterPage, { guild: GUILD, character: char, editable: true });

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

/** An edit button (Edit, Save, Cancel). There's a set for desktop and one for mobile, each hidden
 * by CSS at the other's widths; jsdom has no CSS, so this takes the first, the desktop one. */
const editButton = (name: 'Edit' | 'Save' | 'Cancel'): HTMLElement =>
	screen.getAllByRole('button', { name })[0];

/** The profile description's text box, while editing. */
const descriptionBox = (): HTMLElement => within(panel()).getAllByRole('textbox')[0];

test('has no edit buttons unless editable', () => {
	render(CharacterPage, { guild: GUILD, character: character() });

	expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
});

test('editing the profile, then cancelling, restores it', async () => {
	const user = userEvent.setup();
	renderPage();
	await user.click(screen.getByRole('tab', { name: 'Profile' }));

	await user.click(editButton('Edit'));
	await user.clear(descriptionBox());
	await user.type(descriptionBox(), 'Short.');
	expect(descriptionBox()).toHaveValue('Short.');

	await user.click(editButton('Cancel'));

	expect(within(panel()).getByText('Tall and pale.')).toBeInTheDocument();
	expect(within(panel()).queryByText('Short.')).not.toBeInTheDocument();
});

test('saving keeps the edits', async () => {
	const user = userEvent.setup();
	renderPage();
	await user.click(screen.getByRole('tab', { name: 'Profile' }));

	await user.click(editButton('Edit'));
	await user.type(descriptionBox(), ' Scarred.');
	await user.click(editButton('Save'));

	expect(within(panel()).getByText('Tall and pale. Scarred.')).toBeInTheDocument();
	expect(within(panel()).queryByRole('textbox')).not.toBeInTheDocument();
});

test('edits after a cancel still apply', async () => {
	const user = userEvent.setup();
	renderPage();
	await user.click(screen.getByRole('tab', { name: 'Profile' }));
	await user.click(editButton('Edit'));
	await user.click(editButton('Cancel'));

	// Cancelling restores a copy, which must be as reactive as the original
	await user.click(editButton('Edit'));
	await user.type(descriptionBox(), ' Scarred.');
	await user.click(editButton('Save'));

	expect(within(panel()).getByText('Tall and pale. Scarred.')).toBeInTheDocument();
});

test('new data for the same character shows when not editing', async () => {
	const { rerender } = renderPage();

	// Such as when the page's data reloads
	await rerender({ guild: GUILD, character: { ...character(), name: 'Nadia Vasquez' } });

	expect(screen.getByRole('heading', { name: 'Nadia Vasquez' })).toBeInTheDocument();
});

test('new data after an edit session keeps its new name', async () => {
	const user = userEvent.setup();
	const { rerender } = renderPage();
	await user.click(editButton('Edit'));
	await user.click(editButton('Save'));

	// Renamed elsewhere, such as in Discord
	await rerender({ guild: GUILD, character: { ...character(), name: 'Nadia Vasquez' } });

	expect(screen.getByRole('heading', { name: 'Nadia Vasquez' })).toBeInTheDocument();
});

test('saving keeps the edits even if new data arrived while editing', async () => {
	const user = userEvent.setup();
	const { rerender } = renderPage();
	await user.click(screen.getByRole('tab', { name: 'Profile' }));
	await user.click(editButton('Edit'));
	await user.type(descriptionBox(), ' Scarred.');

	await rerender({ guild: GUILD, character: character() });
	await user.click(editButton('Save'));

	expect(within(panel()).getByText('Tall and pale. Scarred.')).toBeInTheDocument();
});

test('new data that arrives while editing applies once editing ends', async () => {
	const user = userEvent.setup();
	const { rerender } = renderPage();
	await user.click(editButton('Edit'));

	await rerender({ guild: GUILD, character: { ...character(), name: 'Nadia Vasquez' } });
	expect(screen.getByRole('heading', { name: 'Nadia' })).toBeInTheDocument();

	await user.click(editButton('Cancel'));

	expect(screen.getByRole('heading', { name: 'Nadia Vasquez' })).toBeInTheDocument();
});

test('new data for the same character keeps edits in progress', async () => {
	const user = userEvent.setup();
	const { rerender } = renderPage();
	await user.click(screen.getByRole('tab', { name: 'Profile' }));
	await user.click(editButton('Edit'));
	await user.type(descriptionBox(), ' Scarred.');

	// Such as when the page's data reloads
	await rerender({ guild: GUILD, character: character() });

	expect(descriptionBox()).toHaveValue('Tall and pale. Scarred.');
	expect(editButton('Save')).toBeInTheDocument();
});

/** A character with experience and a log, which give it Experience and Chronicle tabs. */
const characterWithLog = (): Character => ({
	...character(),
	experience: {
		current: 2,
		total: 7,
		log: [{ event: 'award_lifetime', amount: 7, reason: 'Downtime', date: '2024-03-05T12:00:00' }]
	},
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
		times_impaired: 0,
		times_mended: 0,
		times_slaked: 0,
		willpower_aggravated: 0,
		willpower_superficial: 0,
		worst_health: '',
		worst_willpower: '',
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
	['#experience', 'XP'],
	['#chronicle', 'Chronicle'],
	['#sheet', 'Sheet'],
	['#nonsense', 'Sheet'],
	['', 'Sheet']
])('the URL hash %j opens the %s tab', (hash, expected) => {
	navigate(`/${hash}`);
	renderPage(characterWithLog());

	expect(selectedTab()).toBe(expected);
});

test.each(['#nonsense', '#sheet'])('the URL hash %j is cleared, keeping the query', (hash) => {
	navigate(`/char?x=1${hash}`);
	renderPage(characterWithLog());

	expect(page.url.href).toBe('http://localhost/char?x=1');
	expect(selectedTab()).toBe('Sheet');
});

test('a valid URL hash is kept', () => {
	navigate('/#profile');
	renderPage(characterWithLog());

	expect(page.url.hash).toBe('#profile');
	expect(goto).not.toHaveBeenCalled();
});

test("leaving the page doesn't touch the next page's hash", () => {
	navigate('/char#profile');
	renderPage(characterWithLog());

	// `page.url` changes before this page is torn down
	navigate('/docs/rolls#rerolls');
	flushSync();

	expect(page.url.href).toBe('http://localhost/docs/rolls#rerolls');
	expect(goto).not.toHaveBeenCalled();
});

test('#chronicle opens the sheet when the character has no log', () => {
	navigate('/#chronicle');
	renderPage();

	expect(selectedTab()).toBe('Sheet');
});

test('selecting a tab puts it in the URL without adding history, and the sheet clears it', async () => {
	const user = userEvent.setup();
	navigate('/char?x=1');
	renderPage(characterWithLog());

	await user.click(screen.getByRole('tab', { name: 'Chronicle' }));
	expect(goto).toHaveBeenLastCalledWith('#chronicle', {
		replaceState: true,
		noScroll: true,
		keepFocus: true
	});
	expect(page.url.hash).toBe('#chronicle');
	expect(selectedTab()).toBe('Chronicle');

	await user.click(screen.getByRole('tab', { name: 'Sheet' }));
	expect(goto).toHaveBeenLastCalledWith('/char?x=1', expect.anything());
	expect(page.url.href).toBe('http://localhost/char?x=1');
	expect(selectedTab()).toBe('Sheet');
});

test('navigating to another hash switches tabs', async () => {
	renderPage(characterWithLog());

	navigate('#profile');

	await waitFor(() => expect(selectedTab()).toBe('Profile'));
});

test('a character with experience has an XP tab, named Experience, showing its log', async () => {
	const user = userEvent.setup();
	renderPage(characterWithLog());

	expect(screen.getAllByRole('tab').map((tab) => tab.textContent?.trim())).toEqual([
		'Sheet',
		'Profile',
		'Chronicle',
		'XP'
	]);
	await user.click(screen.getByRole('tab', { name: 'Experience' }));

	expect(within(panel()).getByText('Downtime')).toBeInTheDocument();
	expect(within(panel()).queryByText('Strength')).not.toBeInTheDocument();
});

test('#experience opens the sheet when the character has no experience', () => {
	navigate('/#experience');
	renderPage();

	expect(selectedTab()).toBe('Sheet');
});
