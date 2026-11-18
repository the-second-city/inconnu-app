import { render, screen, waitFor, within, type RenderResult } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { flushSync } from 'svelte';
import { beforeEach, expect, test, vi } from 'vitest';

import type { Character, Guild } from '$lib/types';
import { navigate, page } from '$lib/testing/page.svelte';
import CharacterPage from './CharacterPage.svelte';
import { CHARACTER_DEPENDENCY } from '$lib/liveUpdates';

// SvelteKit's router doesn't run in tests: `page` is reactive state, which `goto` updates
const goto = vi.hoisted(() => vi.fn());
const invalidate = vi.hoisted(() => vi.fn(async () => {}));
// The page's beforeNavigate callback, so tests can call it as SvelteKit would
const navigation = vi.hoisted(() => ({ before: null as ((nav: unknown) => void) | null }));
vi.mock('$app/state', () => import('$lib/testing/page.svelte'));
vi.mock('$app/paths', () => ({ resolve: (route: string) => route }));
// No busy delay: the save's own promise decides when it's done
vi.mock('$lib/busy', () => ({ atLeast: <T>(work: Promise<T>): Promise<T> => work }));
vi.mock('$app/navigation', () => ({
	goto,
	invalidate,
	beforeNavigate: (callback: (nav: unknown) => void) => {
		navigation.before = callback;
	}
}));

// The viewer is a supporter unless a test says otherwise
const isSupporter = vi.hoisted(() => vi.fn(async () => true));
vi.mock('$lib/premium', () => ({ isSupporter }));

// The API, for saves
const fetchMock = vi.hoisted(() => vi.fn<typeof fetch>());
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
	navigate('http://localhost/');
	goto.mockReset().mockImplementation(async (url: string) => navigate(url));
	navigation.before = null;
	vi.restoreAllMocks();
	// jsdom has no confirm(); agree to discarding edits unless a test says otherwise
	vi.spyOn(window, 'confirm').mockReturnValue(true);
	// Saves succeed unless a test says otherwise
	invalidate.mockClear();
	isSupporter.mockReset().mockResolvedValue(true);
	fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
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

/** Wait for a save to finish, which leaves edit mode. */
const saved = async (): Promise<void> => {
	await waitFor(() =>
		expect(screen.queryByRole('textbox', { name: 'Character name' })).not.toBeInTheDocument()
	);
};

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
	await saved();

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
	await saved();

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
	await user.type(nameBox(), 'h');
	await user.click(editButton('Save'));
	await saved();

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
	await saved();

	expect(within(panel()).getByText('Tall and pale. Scarred.')).toBeInTheDocument();
});

test('new data that arrives while editing applies once editing ends', async () => {
	const user = userEvent.setup();
	const { rerender } = renderPage();
	await user.click(editButton('Edit'));

	await rerender({ guild: GUILD, character: { ...character(), name: 'Nadia Vasquez' } });
	expect(screen.getByRole('heading', { name: 'Nadia' })).toBeInTheDocument();
	await user.click(await screen.findByRole('button', { name: 'Proceed Anyway' }));

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
		num_victims_drained: 0,
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

/** The name's text field, while editing. */
const nameBox = (): HTMLElement => screen.getByRole('textbox', { name: 'Character name' });

test('editing swaps the name for a text field', async () => {
	const user = userEvent.setup();
	renderPage();

	await user.click(editButton('Edit'));

	expect(nameBox()).toHaveValue('Nadia');
});

test('renaming, then saving, keeps the new name, normalized', async () => {
	const user = userEvent.setup();
	renderPage();

	await user.click(editButton('Edit'));
	await user.clear(nameBox());
	await user.type(nameBox(), '  Nadia   Petrova ');
	expect(nameBox()).toHaveValue('  Nadia   Petrova '); // Typing isn't normalized as it goes
	await user.click(editButton('Save'));
	await saved();

	expect(screen.queryByRole('textbox', { name: 'Character name' })).not.toBeInTheDocument();
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nadia Petrova');
});

test('renaming, then cancelling, restores the name', async () => {
	const user = userEvent.setup();
	renderPage();

	await user.click(editButton('Edit'));
	await user.type(nameBox(), 'x');
	await user.click(editButton('Cancel'));

	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nadia');
	await user.click(editButton('Edit'));
	expect(nameBox()).toHaveValue('Nadia');
});

test('an invalid name shows why, and blocks saving', async () => {
	const user = userEvent.setup();
	renderPage();

	await user.click(editButton('Edit'));
	await user.type(nameBox(), 'h!');

	expect(nameBox()).toHaveAccessibleDescription(
		'Name can only contain letters, numbers, spaces, hyphens, underscores, and apostrophes'
	);
	expect(editButton('Save')).toBeDisabled();

	await user.type(nameBox(), '{Backspace}');
	expect(nameBox()).not.toHaveAccessibleDescription();
	expect(editButton('Save')).toBeEnabled();
});

test("cancelling keeps the profile's gallery images, rather than rebuilding them", async () => {
	const user = userEvent.setup();
	const char = character();
	char.profile.images = ['https://example.com/a.webp', 'https://example.com/b.webp'];
	renderPage(char);
	await user.click(screen.getByRole('tab', { name: 'Profile' }));
	const image = within(panel()).getByAltText('Nadia - Image 1');

	await user.click(editButton('Edit'));
	await user.click(editButton('Cancel'));

	expect(within(panel()).getByAltText('Nadia - Image 1')).toBe(image);
});

/** The conviction text fields, while editing. */
const convictionBoxes = (): HTMLElement[] =>
	within(panel()).getAllByRole('textbox', { name: /^Conviction \d$/ });

/** Open the Profile tab and enter edit mode. */
const editProfile = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
	await user.click(screen.getByRole('tab', { name: 'Profile' }));
	await user.click(editButton('Edit'));
};

test('editing shows three conviction fields, filled from the character', async () => {
	const user = userEvent.setup();
	renderPage({ ...character(), convictions: ['Protect the weak'] });

	await editProfile(user);

	expect(convictionBoxes().map((box) => (box as HTMLInputElement).value)).toEqual([
		'Protect the weak',
		'',
		''
	]);
});

test('a character without convictions can add them', async () => {
	const user = userEvent.setup();
	renderPage();
	await user.click(screen.getByRole('tab', { name: 'Profile' }));
	expect(within(panel()).queryByRole('heading', { name: 'Convictions' })).not.toBeInTheDocument();

	await user.click(editButton('Edit'));
	await user.type(convictionBoxes()[1], '  Never   lie ');
	await user.click(editButton('Save'));
	await saved();

	expect(
		within(panel())
			.getAllByRole('listitem')
			.map((item) => item.textContent)
	).toEqual(['Never lie']);
});

test('cancelling restores the convictions', async () => {
	const user = userEvent.setup();
	renderPage({ ...character(), convictions: ['Protect the weak'] });

	await editProfile(user);
	await user.clear(convictionBoxes()[0]);
	await user.type(convictionBoxes()[0], 'Harm the weak');
	await user.click(editButton('Cancel'));

	expect(
		within(panel())
			.getAllByRole('listitem')
			.map((item) => item.textContent)
	).toEqual(['Protect the weak']);
});

test('Save is disabled until something changes', async () => {
	const user = userEvent.setup();
	renderPage();

	await user.click(editButton('Edit'));
	expect(editButton('Save')).toBeDisabled();

	await user.type(nameBox(), 'h');
	expect(editButton('Save')).toBeEnabled();
});

test('undoing a change disables Save again', async () => {
	const user = userEvent.setup();
	renderPage();
	await user.click(screen.getByRole('tab', { name: 'Profile' }));

	await user.click(editButton('Edit'));
	await user.type(descriptionBox(), '!');
	expect(editButton('Save')).toBeEnabled();
	await user.type(descriptionBox(), '{Backspace}');

	expect(editButton('Save')).toBeDisabled();
});

test.each([
	[
		'extra spaces in the name',
		async (user: ReturnType<typeof userEvent.setup>) => {
			await user.type(nameBox(), '  ');
		}
	],
	[
		'a blank conviction',
		async (user: ReturnType<typeof userEvent.setup>) => {
			await user.click(screen.getByRole('tab', { name: 'Profile' }));
			await user.type(convictionBoxes()[2], '   ');
		}
	]
])("%s isn't a change", async (_, edit) => {
	const user = userEvent.setup();
	renderPage({ ...character(), convictions: ['Protect the weak'] });

	await user.click(editButton('Edit'));
	await edit(user);

	expect(editButton('Save')).toBeDisabled();
});

/** Navigate away as SvelteKit would, through the page's beforeNavigate. Returns whether the
 * navigation was cancelled. */
const leave = (type: string, toPath: string | null = '/characters'): boolean => {
	const cancel = vi.fn();
	navigation.before?.({
		type,
		from: { url: new URL('http://localhost/characters/guild/111/id') },
		to: toPath === null ? null : { url: new URL(`http://localhost${toPath}`) },
		cancel
	});
	return cancel.mock.calls.length > 0;
};

/** Enter edit mode and make an unsaved change. */
const makeChange = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
	await user.click(editButton('Edit'));
	await user.type(nameBox(), 'h');
};

test('cancelling with unsaved changes asks first, and keeps editing if declined', async () => {
	const user = userEvent.setup();
	const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
	renderPage();
	await makeChange(user);

	await user.click(editButton('Cancel'));

	expect(confirm).toHaveBeenCalledWith('Discard your unsaved changes?');
	expect(nameBox()).toHaveValue('Nadiah');
});

test('cancelling with unsaved changes discards them once confirmed', async () => {
	const user = userEvent.setup();
	vi.spyOn(window, 'confirm').mockReturnValue(true);
	renderPage();
	await makeChange(user);

	await user.click(editButton('Cancel'));

	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nadia');
	expect(screen.queryByRole('textbox', { name: 'Character name' })).not.toBeInTheDocument();
});

test("cancelling without changes doesn't ask", async () => {
	const user = userEvent.setup();
	const confirm = vi.spyOn(window, 'confirm');
	renderPage();

	await user.click(editButton('Edit'));
	await user.click(editButton('Cancel'));

	expect(confirm).not.toHaveBeenCalled();
});

test.each([
	[false, true],
	[true, false]
])('leaving with unsaved changes asks; confirming %s cancels: %s', async (agree, cancelled) => {
	const user = userEvent.setup();
	vi.spyOn(window, 'confirm').mockReturnValue(agree);
	renderPage();
	await makeChange(user);

	expect(leave('link')).toBe(cancelled);
});

test("closing the tab with unsaved changes leaves it to the browser's prompt", async () => {
	const user = userEvent.setup();
	const confirm = vi.spyOn(window, 'confirm');
	renderPage();
	await makeChange(user);

	expect(leave('leave', null)).toBe(true);
	expect(confirm).not.toHaveBeenCalled();
});

test("switching tabs, or leaving without changes, doesn't ask", async () => {
	const user = userEvent.setup();
	const confirm = vi.spyOn(window, 'confirm');
	renderPage();

	await user.click(editButton('Edit'));
	expect(leave('link')).toBe(false);
	await user.type(nameBox(), 'h');
	expect(leave('goto', '/characters/guild/111/id')).toBe(false);

	expect(confirm).not.toHaveBeenCalled();
});

/** The notice that the character changed while editing, once it opens. */
const staleNotice = (): Promise<HTMLElement> => screen.findByRole('alertdialog');

test('new data that changes editable fields while editing opens a notice', async () => {
	const user = userEvent.setup();
	const { rerender } = renderPage();
	await user.click(editButton('Edit'));

	await rerender({ guild: GUILD, character: { ...character(), health: '....//' } });

	expect(
		within(await staleNotice()).getByText(/changed while you were editing/)
	).toBeInTheDocument();
});

test("new data that changes only the Chronicle log doesn't open the notice", async () => {
	const user = userEvent.setup();
	const { rerender } = renderPage();
	await user.click(editButton('Edit'));

	const log = { created: '2024-01-01T00:00:00', left: null } as unknown as Character['log'];
	await rerender({ guild: GUILD, character: { ...character(), log } });

	expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});

test("the notice's Reload takes the new data, discarding the edits", async () => {
	const user = userEvent.setup();
	const { rerender } = renderPage();
	await makeChange(user);

	await rerender({ guild: GUILD, character: { ...character(), name: 'Nadia Vasquez' } });
	await user.click(within(await staleNotice()).getByRole('button', { name: 'Reload' }));

	expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
	expect(screen.queryByRole('textbox', { name: 'Character name' })).not.toBeInTheDocument();
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nadia Vasquez');
});

test("the notice's Proceed Anyway keeps editing, and Save keeps the edits", async () => {
	const user = userEvent.setup();
	const { rerender } = renderPage();
	await makeChange(user);

	await rerender({ guild: GUILD, character: { ...character(), name: 'Nadia Vasquez' } });
	await user.click(within(await staleNotice()).getByRole('button', { name: 'Proceed Anyway' }));
	expect(nameBox()).toHaveValue('Nadiah');
	await user.click(editButton('Save'));
	await saved();

	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nadiah');
});

test('the notice opens once for each new version', async () => {
	const user = userEvent.setup();
	const fresh = { ...character(), name: 'Nadia Vasquez' };
	const { rerender } = renderPage();
	await user.click(editButton('Edit'));

	await rerender({ guild: GUILD, character: fresh });
	await user.click(within(await staleNotice()).getByRole('button', { name: 'Proceed Anyway' }));
	await rerender({ guild: GUILD, character: fresh });
	expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

	await rerender({ guild: GUILD, character: { ...fresh, health: '....//' } });
	expect(await staleNotice()).toBeInTheDocument();
});

test("after Proceed Anyway, a version that changes only the log doesn't ask again", async () => {
	const user = userEvent.setup();
	const damaged = { ...character(), health: '....//' };
	const { rerender } = renderPage();
	await user.click(editButton('Edit'));

	await rerender({ guild: GUILD, character: damaged });
	await user.click(within(await staleNotice()).getByRole('button', { name: 'Proceed Anyway' }));
	const log = { created: '2024-01-01T00:00:00', left: null } as unknown as Character['log'];
	await rerender({ guild: GUILD, character: { ...damaged, log } });

	expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});

/** Press a key on the page, as a keyboard shortcut. */
const press = (
	key: string,
	modifiers: { metaKey?: boolean; ctrlKey?: boolean } = {}
): KeyboardEvent => {
	const event = new KeyboardEvent('keydown', {
		key,
		bubbles: true,
		cancelable: true,
		...modifiers
	});
	document.body.dispatchEvent(event);
	flushSync();
	return event;
};

test.each([
	['s', { metaKey: true }],
	['s', { ctrlKey: true }],
	['Enter', { metaKey: true }]
])('%s with %o saves', async (key, modifiers) => {
	const user = userEvent.setup();
	renderPage();
	await makeChange(user);

	const event = press(key, modifiers);

	expect(event.defaultPrevented).toBe(true);
	await saved();
	expect(screen.queryByRole('textbox', { name: 'Character name' })).not.toBeInTheDocument();
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nadiah');
});

test("⌘S without changes doesn't save, or let the browser save the page", async () => {
	const user = userEvent.setup();
	renderPage();
	await user.click(editButton('Edit'));

	const event = press('s', { metaKey: true });

	expect(event.defaultPrevented).toBe(true);
	expect(nameBox()).toBeInTheDocument();
});

test('shortcuts do nothing outside edit mode', () => {
	renderPage();

	expect(press('s', { metaKey: true }).defaultPrevented).toBe(false);
	expect(press('Escape').defaultPrevented).toBe(false);
});

test('Escape cancels editing', async () => {
	const user = userEvent.setup();
	renderPage();
	await makeChange(user);

	press('Escape');

	expect(screen.queryByRole('textbox', { name: 'Character name' })).not.toBeInTheDocument();
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nadia');
});

test("Escape with a dialog open doesn't cancel editing", async () => {
	const user = userEvent.setup();
	const { rerender } = renderPage();
	await makeChange(user);
	await rerender({ guild: GUILD, character: { ...character(), name: 'Nadia Vasquez' } });
	await staleNotice();

	press('Escape');

	expect(nameBox()).toHaveValue('Nadiah');
});

test('Save and Cancel name their shortcuts', async () => {
	const user = userEvent.setup();
	renderPage();
	await user.click(editButton('Edit'));

	expect(editButton('Save')).toHaveAttribute('aria-keyshortcuts', 'Meta+S Control+S');
	expect(editButton('Cancel')).toHaveAttribute('aria-keyshortcuts', 'Escape');
});

/** The body of the last save sent to the API. */
const sentBody = (): Record<string, unknown> =>
	JSON.parse(fetchMock.mock.calls.at(-1)?.[1]?.body as string) as Record<string, unknown>;

/** A validation error response from the API. */
const invalidResponse = (loc: (string | number)[], msg: string): Response =>
	Response.json({ detail: [{ loc, msg, type: 'value_error' }] }, { status: 422 });

test('saving sends the edits to the API, then refetches the character', async () => {
	const user = userEvent.setup();
	renderPage();
	await makeChange(user);

	await user.click(editButton('Save'));
	await saved();

	expect(fetchMock).toHaveBeenCalledWith(
		'/api/characters/[id=objectid]',
		expect.objectContaining({ method: 'PATCH' })
	);
	expect(sentBody()).toMatchObject({ name: 'Nadiah', health: '......', humanity: 7 });
	expect(sentBody()).not.toHaveProperty('potency'); // A mortal
	expect(invalidate).toHaveBeenCalledWith(CHARACTER_DEPENDENCY);
});

test('while saving, Save and Cancel are disabled', async () => {
	const user = userEvent.setup();
	let answer: (response: Response) => void = () => {};
	fetchMock.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
	renderPage();
	await makeChange(user);

	await user.click(editButton('Save'));

	expect(editButton('Save')).toBeDisabled();
	expect(editButton('Save')).toHaveAttribute('aria-busy', 'true');
	expect(editButton('Cancel')).toBeDisabled();
	answer(new Response(null, { status: 204 }));
	await saved();
});

test("the API's error for the name shows with the name, until it's changed", async () => {
	const user = userEvent.setup();
	fetchMock.mockResolvedValueOnce(
		invalidResponse(['body', 'name'], "There's already a character named `Nadiah`.")
	);
	renderPage();
	await makeChange(user);

	await user.click(editButton('Save'));

	await waitFor(() =>
		expect(nameBox()).toHaveAccessibleDescription("There's already a character named `Nadiah`.")
	);
	expect(editButton('Save')).toBeDisabled();

	await user.type(nameBox(), 'x');
	expect(nameBox()).not.toHaveAccessibleDescription();
	expect(editButton('Save')).toBeEnabled();
});

test('other errors are listed, and the edits stay', async () => {
	const user = userEvent.setup();
	fetchMock.mockResolvedValueOnce(
		invalidResponse(['body', 'traits', 0, 'rating'], '`Strength` must be between 0 and 5.')
	);
	renderPage();
	await makeChange(user);

	await user.click(editButton('Save'));

	const alert = await screen.findByRole('alert');
	expect(within(alert).getByText("Your changes weren't saved.")).toBeInTheDocument();
	expect(
		within(alert).getByText('Strength: `Strength` must be between 0 and 5.')
	).toBeInTheDocument();
	expect(nameBox()).toHaveValue('Nadiah');
	expect(invalidate).not.toHaveBeenCalled();
});

test('an unreachable API says so, and the edits stay', async () => {
	const user = userEvent.setup();
	fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
	renderPage();
	await makeChange(user);

	await user.click(editButton('Save'));

	expect(await screen.findByRole('alert')).toHaveTextContent(
		"Couldn't reach Inconnu to save your changes."
	);
	expect(nameBox()).toHaveValue('Nadiah');
});

test("cancelling clears a failed save's errors", async () => {
	const user = userEvent.setup();
	fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
	renderPage();
	await makeChange(user);
	await user.click(editButton('Save'));
	await screen.findByRole('alert');

	await user.click(editButton('Cancel'));
	await user.click(editButton('Edit'));

	expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test("new data that changes only images doesn't open the notice, as Save doesn't send them", async () => {
	const user = userEvent.setup();
	const { rerender } = renderPage();
	await makeChange(user);

	const fresh = character();
	fresh.profile.images = ['https://example.com/new.webp'];
	await rerender({ guild: GUILD, character: fresh });

	expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});

test("a failed save's errors don't come back after Reload", async () => {
	const user = userEvent.setup();
	fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
	const { rerender } = renderPage();
	await makeChange(user);
	await user.click(editButton('Save'));
	await screen.findByRole('alert');

	await rerender({ guild: GUILD, character: { ...character(), name: 'Nadia Vasquez' } });
	await user.click(within(await staleNotice()).getByRole('button', { name: 'Reload' }));
	await user.click(editButton('Edit'));

	expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test("⌘S doesn't save while the notice asks whether to keep the edits", async () => {
	const user = userEvent.setup();
	const { rerender } = renderPage();
	await makeChange(user);
	await rerender({ guild: GUILD, character: { ...character(), name: 'Nadia Vasquez' } });
	await staleNotice();

	const event = press('s', { metaKey: true });

	expect(event.defaultPrevented).toBe(true);
	expect(fetchMock).not.toHaveBeenCalled();
	expect(nameBox()).toHaveValue('Nadiah');
});

/** A vampire version of the test character, at Hunger 2. */
const vampire = (): Character => ({
	...character(),
	splat: 'vampire',
	potency: 1,
	hunger: 2,
	stains: 1
});

test('with the tracker actions, Hunger opens the Rouse modal', async () => {
	const user = userEvent.setup();
	render(CharacterPage, {
		guild: GUILD,
		character: vampire(),
		editable: true,
		actionable: true,
		ownerActions: true
	});

	await user.click(screen.getByRole('button', { name: 'Hunger actions' }));
	await user.click(
		within(await screen.findByRole('dialog')).getByRole('button', { name: 'Rouse' })
	);

	expect(await screen.findByRole('dialog', { name: 'Rouse Check' })).toBeInTheDocument();
});

test('without the tracker actions, Hunger and Humanity open no menus', () => {
	render(CharacterPage, { guild: GUILD, character: vampire(), editable: true });

	expect(screen.queryByRole('button', { name: 'Hunger actions' })).not.toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Humanity actions' })).not.toBeInTheDocument();
});

test('with the tracker actions, Mend in the Health menu opens the Mend modal', async () => {
	const user = userEvent.setup();
	const damaged = { ...vampire(), health: '....//' };
	render(CharacterPage, {
		guild: GUILD,
		character: damaged,
		editable: true,
		actionable: true,
		ownerActions: true
	});

	await user.click(screen.getByRole('button', { name: 'Health actions' }));
	await user.click(
		within(await screen.findByRole('dialog')).getByRole('button', { name: 'Mend Superficial' })
	);

	expect(await screen.findByRole('dialog', { name: 'Mend Damage' })).toBeInTheDocument();
});

test("a Storyteller on a player's character may deal damage and Stains, but not Rouse, Slake or Remorse", async () => {
	const user = userEvent.setup();
	render(CharacterPage, { guild: GUILD, character: vampire(), editable: true, actionable: true });

	expect(screen.getByRole('button', { name: 'Health actions' })).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Hunger actions' })).not.toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: 'Humanity actions' }));
	const menu = await screen.findByRole('dialog');
	expect(within(menu).getByRole('button', { name: 'Apply Stains' })).toBeInTheDocument();
	expect(within(menu).queryByRole('button', { name: 'Remorse' })).not.toBeInTheDocument();
});

test.each([
	['Hunger actions', 'Slake', 'Slake Hunger'],
	['Humanity actions', 'Apply Stains', 'Apply Stains'],
	['Humanity actions', 'Remorse', 'Remorse Test']
])('%s → %s opens its modal', async (trigger, action, title) => {
	const user = userEvent.setup();
	render(CharacterPage, {
		guild: GUILD,
		character: vampire(),
		editable: true,
		actionable: true,
		ownerActions: true
	});

	await user.click(screen.getByRole('button', { name: trigger }));
	await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: action }));

	expect(await screen.findByRole('dialog', { name: title })).toBeInTheDocument();
});

test('a supporter clicking Edit enters edit mode', async () => {
	const user = userEvent.setup();
	renderPage();

	await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);

	expect(isSupporter).toHaveBeenCalledOnce();
	expect(await screen.findAllByRole('button', { name: 'Save' })).not.toHaveLength(0);
});

test('a non-supporter clicking Edit sees the upsell, and stays out of edit mode', async () => {
	const user = userEvent.setup();
	isSupporter.mockResolvedValue(false);
	renderPage();

	await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);

	const upsell = await screen.findByRole('dialog', { name: 'A Premium Feature' });
	expect(within(upsell).getByText(/Editing characters/)).toBeInTheDocument();
	expect(within(upsell).getByRole('link', { name: 'Become a Supporter' })).toHaveAttribute(
		'href',
		'https://patreon.com/tiltowait'
	);
	const learnMore = within(upsell).getByRole('link', { name: 'Learn more.' });
	expect(learnMore).toHaveAttribute('href', '/docs/[...path]');
	expect(learnMore).toHaveAttribute('target', '_blank');
	expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
});

test.each([
	['Hunger actions', 'Rouse', 'Rouse Check'],
	['Hunger actions', 'Slake', 'Slake Hunger'],
	['Humanity actions', 'Apply Stains', 'Apply Stains'],
	['Humanity actions', 'Remorse', 'Remorse Test'],
	['Health actions', 'Take Damage', 'Take Damage']
])('a non-supporter choosing %s → %s sees the upsell instead', async (trigger, action, title) => {
	const user = userEvent.setup();
	isSupporter.mockResolvedValue(false);
	render(CharacterPage, {
		guild: GUILD,
		character: vampire(),
		editable: true,
		actionable: true,
		ownerActions: true
	});

	await user.click(screen.getByRole('button', { name: trigger }));
	await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: action }));

	const upsell = await screen.findByRole('dialog', { name: 'A Premium Feature' });
	expect(within(upsell).getByText(/Using gameplay actions/)).toBeInTheDocument();
	expect(screen.queryByRole('dialog', { name: title })).not.toBeInTheDocument();
});

test('the upsell closes with Not Now', async () => {
	const user = userEvent.setup();
	isSupporter.mockResolvedValue(false);
	renderPage();

	await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
	const upsell = await screen.findByRole('dialog', { name: 'A Premium Feature' });
	await user.click(within(upsell).getByRole('button', { name: 'Not Now' }));

	await waitFor(() =>
		expect(screen.queryByRole('dialog', { name: 'A Premium Feature' })).not.toBeInTheDocument()
	);
});
