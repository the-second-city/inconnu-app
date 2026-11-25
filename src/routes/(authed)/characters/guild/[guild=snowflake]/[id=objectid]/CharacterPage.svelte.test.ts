import { render, screen, waitFor, within, type RenderResult } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { flushSync } from 'svelte';
import { beforeEach, expect, test, vi } from 'vitest';

import type { Character, Guild } from '$lib/types';
import { navigate, page } from '$lib/testing/page.svelte';
import { TEST_CONSTRAINTS } from '$lib/testing/constraints';
import CharacterPage from './CharacterPage.svelte';
import { upsell } from '$lib/state/premium.svelte';

// SvelteKit's router doesn't run in tests: `page` is reactive state, which `goto` updates
const goto = vi.hoisted(() => vi.fn());
const invalidate = vi.hoisted(() => vi.fn(async () => {}));
// The page's beforeNavigate callback, so tests can call it as SvelteKit would
const navigation = vi.hoisted(() => ({ before: null as ((nav: unknown) => void) | null }));
vi.mock('$app/state', () => import('$lib/testing/page.svelte'));
// Fills in a route's params, as SvelteKit's resolve() does
vi.mock('$app/paths', () => ({
	resolve: (route: string, params: Record<string, string> = {}) =>
		route.replace(/\[(\w+)(?:=\w+)?\]/g, (param, name: string) => params[name] ?? param)
}));
// No busy delay: the save's own promise decides when it's done
vi.mock('$lib/state/busy', () => ({ atLeast: <T>(work: Promise<T>): Promise<T> => work }));
vi.mock('$app/navigation', () => ({
	goto,
	invalidate,
	beforeNavigate: (callback: (nav: unknown) => void) => {
		navigation.before = callback;
	}
}));

// Toasts, so tests can see what was said
const toaster = vi.hoisted(() => ({ warning: vi.fn() }));
vi.mock('$lib/state/toaster', () => ({ toaster }));

// The viewer is a supporter unless a test says otherwise
const isSupporter = vi.hoisted(() => vi.fn(async () => true));
vi.mock('$lib/state/premium.svelte', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/state/premium.svelte')>()),
	isSupporter
}));

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
	upsell.open = false;
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
	render(CharacterPage, {
		constraints: TEST_CONSTRAINTS,
		guild: GUILD,
		character: char,
		editable: true
	});

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
const descriptionBox = (): HTMLElement =>
	within(panel()).getByRole('textbox', { name: 'Description' });

test('has no edit buttons unless editable', () => {
	render(CharacterPage, { constraints: TEST_CONSTRAINTS, guild: GUILD, character: character() });

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

test('a name with a phone’s curly apostrophe is accepted, and saved straightened', async () => {
	const user = userEvent.setup();
	renderPage();

	await user.click(editButton('Edit'));
	await user.clear(nameBox());
	await user.type(nameBox(), 'Nadia O\u2019Brien');
	expect(nameBox()).not.toHaveAccessibleDescription();
	await user.click(editButton('Save'));
	await saved();

	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("Nadia O'Brien");
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

test('an over-long conviction blocks saving', async () => {
	const user = userEvent.setup();
	renderPage();

	await editProfile(user);
	const box = convictionBoxes()[0];
	await user.click(box);
	await user.paste('a'.repeat(TEST_CONSTRAINTS.conviction_max_length + 1));
	expect(editButton('Save')).toBeDisabled();
	// The field says why, so the notice for other tabs stays away
	expect(screen.queryByRole('status')).not.toBeInTheDocument();

	await user.type(box, '{Backspace}');
	expect(editButton('Save')).toBeEnabled();
});

test('off the Profile tab, a notice says which text holds Save', async () => {
	const user = userEvent.setup();
	renderPage({ ...character(), profile: { ...character().profile, description: 'Pale.' } });

	await editProfile(user);
	await user.click(convictionBoxes()[1]);
	await user.paste('a'.repeat(TEST_CONSTRAINTS.conviction_max_length + 1));
	await user.click(within(panel()).getByRole('textbox', { name: 'Description' }));
	await user.paste('a'.repeat(TEST_CONSTRAINTS.profile_max_length));
	await user.click(screen.getByRole('tab', { name: 'Sheet' }));

	expect(editButton('Save')).toBeDisabled();
	expect(screen.getByRole('status')).toHaveTextContent(
		'To save, shorten the Profile tab’s Description and Conviction 2.'
	);

	await user.click(
		within(screen.getByRole('status')).getByRole('button', { name: 'Go to Profile' })
	);
	expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
	expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

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

test('saving sends the edits to the API, leaving the refetch to the live update', async () => {
	const user = userEvent.setup();
	renderPage();
	await makeChange(user);

	await user.click(editButton('Save'));
	await saved();

	expect(fetchMock).toHaveBeenCalledWith(
		'/api/characters/id',
		expect.objectContaining({ method: 'PATCH' })
	);
	expect(sentBody()).toMatchObject({ name: 'Nadiah', health: '......', humanity: 7 });
	expect(sentBody()).not.toHaveProperty('potency'); // A mortal
	expect(invalidate).not.toHaveBeenCalled();
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

test("the bot's copy shows after saving, even when its refetch lands before the save ends", async () => {
	const user = userEvent.setup();
	let answer: (response: Response) => void = () => {};
	fetchMock.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
	const { rerender } = renderPage();
	await makeChange(user);
	await user.click(editButton('Save'));

	// The bot answers, and its live update refetches while the spinner still runs. The bot's copy
	// differs from the edits (a change in Discord, say), so it shows which one the page kept
	const profile = { description: 'Stored by the bot.', biography: null, images: [] };
	await rerender({ guild: GUILD, character: { ...character(), name: 'Nadiah', profile } });
	answer(new Response(null, { status: 204 }));
	await saved();

	await user.click(screen.getByRole('tab', { name: 'Profile' }));
	expect(within(panel()).getByText('Stored by the bot.')).toBeInTheDocument();
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
		constraints: TEST_CONSTRAINTS,
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
	render(CharacterPage, {
		constraints: TEST_CONSTRAINTS,
		guild: GUILD,
		character: vampire(),
		editable: true
	});

	expect(screen.queryByRole('button', { name: 'Hunger actions' })).not.toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Humanity actions' })).not.toBeInTheDocument();
});

test('with the tracker actions, Mend in the Health menu opens the Mend modal', async () => {
	const user = userEvent.setup();
	const damaged = { ...vampire(), health: '....//' };
	render(CharacterPage, {
		constraints: TEST_CONSTRAINTS,
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
	render(CharacterPage, {
		constraints: TEST_CONSTRAINTS,
		guild: GUILD,
		character: vampire(),
		editable: true,
		actionable: true
	});

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
		constraints: TEST_CONSTRAINTS,
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
	['Health actions', 'Take Damage', 'Take Damage'],
	['Health actions', 'Mend Superficial', 'Mend Damage']
])('a non-supporter choosing %s → %s sees the upsell instead', async (trigger, action, title) => {
	const user = userEvent.setup();
	isSupporter.mockResolvedValue(false);
	render(CharacterPage, {
		constraints: TEST_CONSTRAINTS,
		guild: GUILD,
		character: { ...vampire(), health: '....//' },
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

test("a non-supporter choosing a ghoul's Rouse sees the upsell instead", async () => {
	const user = userEvent.setup();
	isSupporter.mockResolvedValue(false);
	const ghoul: Character = { ...character(), splat: 'ghoul' };
	render(CharacterPage, {
		constraints: TEST_CONSTRAINTS,
		guild: GUILD,
		character: ghoul,
		editable: true,
		actionable: true,
		ownerActions: true
	});

	await user.click(screen.getByRole('button', { name: 'Health actions' }));
	await user.click(
		within(await screen.findByRole('dialog')).getByRole('button', { name: 'Rouse' })
	);

	expect(await screen.findByRole('dialog', { name: 'A Premium Feature' })).toBeInTheDocument();
	expect(screen.queryByRole('dialog', { name: 'Rouse Check' })).not.toBeInTheDocument();
});

test('while one premium check is pending, other actions wait for it', async () => {
	const user = userEvent.setup();
	let answer: (supporter: boolean) => void = () => {};
	isSupporter.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
	render(CharacterPage, {
		constraints: TEST_CONSTRAINTS,
		guild: GUILD,
		character: vampire(),
		editable: true,
		actionable: true,
		ownerActions: true
	});

	await user.click(screen.getByRole('button', { name: 'Hunger actions' }));
	await user.click(
		within(await screen.findByRole('dialog')).getByRole('button', { name: 'Slake' })
	);
	await user.click(screen.getByRole('button', { name: 'Humanity actions' }));
	await user.click(
		within(await screen.findByRole('dialog')).getByRole('button', { name: 'Apply Stains' })
	);
	answer(true);

	expect(await screen.findByRole('dialog', { name: 'Slake Hunger' })).toBeInTheDocument();
	expect(isSupporter).toHaveBeenCalledOnce();
	expect(screen.queryByRole('dialog', { name: 'Apply Stains' })).not.toBeInTheDocument();
});

test('the API refusing a save for premium opens the upsell, and keeps the edits', async () => {
	const user = userEvent.setup();
	fetchMock.mockResolvedValueOnce(
		Response.json({ detail: 'This feature is for supporters only' }, { status: 403 })
	);
	renderPage();
	await makeChange(user);

	await user.click(editButton('Save'));

	const upsell = await screen.findByRole('dialog', { name: 'A Premium Feature' });
	expect(within(upsell).getByText(/Editing characters/)).toBeInTheDocument();
	expect(screen.getByRole('alert')).toHaveTextContent('This feature is for supporters only.');
	expect(nameBox()).toHaveValue('Nadiah');
});

/** Render the character page for its owner, who may also edit its macros. */
const renderOwnerPage = (char: Character = character()): RenderResult<typeof CharacterPage> =>
	render(CharacterPage, {
		constraints: TEST_CONSTRAINTS,
		guild: GUILD,
		character: char,
		editable: true,
		ownerActions: true
	});

/** The mortal with one macro. */
const withMacro = (): Character => ({
	...character(),
	macros: [
		{
			name: 'lift',
			pool: ['Strength', '+', '2'],
			hunger: false,
			difficulty: 2,
			rouses: 0,
			reroll_rouses: false,
			staining: 'show',
			hunt: false,
			comment: null
		}
	]
});

test('the macros show below the sheet, with no Macros button', () => {
	renderPage(withMacro());

	const macros = within(panel()).getByRole('region', { name: 'Macros' });
	expect(within(macros).getByRole('article', { name: 'lift' })).toHaveTextContent('4 dice');
	expect(screen.queryByRole('button', { name: 'Macros' })).not.toBeInTheDocument();
});

test('a character without macros has no Macros section', () => {
	renderPage();

	expect(screen.queryByRole('region', { name: 'Macros' })).not.toBeInTheDocument();
});

test('with ?macros=panel, the Macros button opens and closes a panel of them', async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacro());

	expect(screen.queryByRole('region', { name: 'Macros' })).not.toBeInTheDocument();
	// One for wide windows, one floating for phones
	const [button] = screen.getAllByRole('button', { name: 'Macros' });
	expect(button).toHaveAttribute('aria-expanded', 'false');

	await user.click(button);
	const dialog = screen.getByRole('dialog', { name: 'Macros' });
	expect(within(dialog).getByRole('article', { name: 'lift' })).toBeInTheDocument();
	expect(button).toHaveAttribute('aria-expanded', 'true');

	await user.click(within(dialog).getByRole('button', { name: 'Close macros' }));
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test('the macro panel and edit mode wait for each other', async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacro());
	const toggle = screen.getAllByRole('button', { name: 'Macros' })[0];
	await user.click(toggle);

	// While the panel's open, it closes itself: Edit and Macros wait
	const dialog = screen.getByRole('dialog', { name: 'Macros' });
	expect(toggle).toBeDisabled();
	expect(editButton('Edit')).toBeDisabled();
	await user.click(within(dialog).getByRole('button', { name: 'Close macros' }));
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	expect(toggle).toBeEnabled();

	// While editing, Macros waits
	await user.click(editButton('Edit'));
	for (const button of screen.getAllByRole('button', { name: 'Macros' })) {
		expect(button).toBeDisabled();
	}
	await user.click(editButton('Cancel'));
	expect(toggle).toBeEnabled();
});

test('with ?macros=panel, an editor without macros can open the panel to add one', async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage();

	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);

	const dialog = screen.getByRole('dialog', { name: 'Macros' });
	expect(dialog).toHaveTextContent('No macros yet.');
	expect(within(dialog).getByRole('button', { name: 'Add macro' })).toBeInTheDocument();
});

test("a Storyteller on a player's character gets no Macros button without macros, nor Add", async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	// Full access, but not the owner's actions: only the owner edits a player's macros
	const { rerender } = renderPage();
	expect(screen.queryByRole('button', { name: 'Macros' })).not.toBeInTheDocument();

	await rerender({ character: withMacro() });
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	expect(screen.getByRole('dialog', { name: 'Macros' })).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Add macro' })).not.toBeInTheDocument();
});

test('Add switches the panel to the new macro form; Escape backs out, then closes', async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacro());
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);

	await user.click(screen.getByRole('button', { name: 'Add macro' }));

	const dialog = await screen.findByRole('dialog', { name: 'New Macro' });
	expect(within(dialog).getByRole('form', { name: 'New macro' })).toBeInTheDocument();
	// The list fades out as the form fades in
	await waitFor(() => expect(within(dialog).queryByRole('article')).not.toBeInTheDocument());

	await user.keyboard('{Escape}');
	expect(await screen.findByRole('dialog', { name: 'Macros' })).toBeInTheDocument();
	await user.keyboard('{Escape}');
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test('reopening the panel shows the list, not a macro in progress', async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacro());
	const toggle = screen.getAllByRole('button', { name: 'Macros' })[0];
	await user.click(toggle);
	await user.click(screen.getByRole('button', { name: 'Add macro' }));
	await screen.findByRole('dialog', { name: 'New Macro' });

	await user.click(screen.getByRole('button', { name: 'Close macros' }));
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	await user.click(toggle);

	expect(await screen.findByRole('dialog', { name: 'Macros' })).toBeInTheDocument();
});

test('a non-supporter who clicks Add gets the upsell', async () => {
	const user = userEvent.setup();
	isSupporter.mockResolvedValue(false);
	navigate('/char?macros=panel');
	renderOwnerPage(withMacro());
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);

	await user.click(screen.getByRole('button', { name: 'Add macro' }));

	await waitFor(() => expect(upsell.open).toBe(true));
	expect(upsell.feature).toBe('Editing macros');
	expect(screen.getByRole('dialog', { name: 'Macros' })).toBeInTheDocument();
});

/** The mortal with two macros, "lift" and "punch". */
const withMacros = (): Character => {
	const char = withMacro();
	const lift = char.macros?.[0];
	return { ...char, macros: lift ? [lift, { ...lift, name: 'punch' }] : [] };
};

/** Open the macro panel (in ?macros=panel mode) and switch it to editing, returning the panel. */
const editMacros = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	await user.click(screen.getByRole('button', { name: 'Edit macros' }));
	return screen.findByRole('dialog', { name: 'Edit Macros' });
};

/** The macro names in the panel. */
const macroNames = (dialog: HTMLElement): string[] =>
	within(dialog)
		.queryAllByRole('article')
		.map((article) => article.getAttribute('aria-label') ?? '');

test('editing macros swaps Add and Edit for Cancel and Save, and offers to delete each', async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacros());

	const dialog = await editMacros(user);

	await waitFor(() => {
		expect(within(dialog).queryByRole('button', { name: 'Add macro' })).not.toBeInTheDocument();
		expect(within(dialog).queryByRole('button', { name: 'Edit macros' })).not.toBeInTheDocument();
	});
	expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeEnabled();
	expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled();
	expect(within(dialog).getByRole('button', { name: 'Delete lift' })).toBeInTheDocument();
	expect(within(dialog).getByRole('button', { name: 'Delete punch' })).toBeInTheDocument();
});

test('there is nothing to edit without macros', async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage();

	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);

	expect(screen.getByRole('button', { name: 'Add macro' })).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Edit macros' })).not.toBeInTheDocument();
});

test('a deleted macro comes back on Cancel, without saving', async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacros());
	const dialog = await editMacros(user);

	await user.click(within(dialog).getByRole('button', { name: 'Delete lift' }));
	await waitFor(() => expect(macroNames(dialog)).toEqual(['punch']));
	expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled();

	await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

	const list = await screen.findByRole('dialog', { name: 'Macros' });
	await waitFor(() => expect(macroNames(list)).toEqual(['lift', 'punch']));
	// The Delete buttons fade out
	await waitFor(() =>
		expect(within(list).queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument()
	);
	expect(fetchMock).not.toHaveBeenCalled();
});

test('Escape cancels editing macros', async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacros());
	const dialog = await editMacros(user);
	await user.click(within(dialog).getByRole('button', { name: 'Delete lift' }));

	await user.keyboard('{Escape}');

	const list = await screen.findByRole('dialog', { name: 'Macros' });
	await waitFor(() => expect(macroNames(list)).toEqual(['lift', 'punch']));
});

/** The requests sent, as "METHOD url". */
const requests = (): string[] =>
	fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${String(url)}`);

test('Save deletes each macro marked, one at a time, hiding them until the live update', async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	const { rerender } = renderOwnerPage(withMacros());
	const dialog = await editMacros(user);

	await user.click(within(dialog).getByRole('button', { name: 'Delete lift' }));
	await user.click(within(dialog).getByRole('button', { name: 'Delete punch' }));
	await user.click(within(dialog).getByRole('button', { name: 'Save' }));

	expect(requests()).toEqual([
		'DELETE /api/characters/id/macros/lift',
		'DELETE /api/characters/id/macros/punch'
	]);
	const list = await screen.findByRole('dialog', { name: 'Macros' });
	await waitFor(() => expect(macroNames(list)).toEqual([]));

	// A live update from before the deletes still has them: they stay hidden
	await rerender({ character: withMacros() });
	expect(macroNames(list)).toEqual([]);

	// The deletes' own update brings macros without them; one made again later shows
	await rerender({ character: { ...withMacros(), macros: [] } });
	await rerender({ character: withMacros() });
	await waitFor(() => expect(macroNames(list)).toEqual(['lift', 'punch']));
});

test('the deletes wait for each other', async () => {
	let finishFirst: (response: Response) => void = () => {};
	fetchMock.mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)));
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacros());
	const dialog = await editMacros(user);
	await user.click(within(dialog).getByRole('button', { name: 'Delete lift' }));
	await user.click(within(dialog).getByRole('button', { name: 'Delete punch' }));

	await user.click(within(dialog).getByRole('button', { name: 'Save' }));
	expect(requests()).toHaveLength(1);

	finishFirst(new Response(null, { status: 204 }));
	await waitFor(() => expect(requests()).toHaveLength(2));
});

test('a macro already gone counts as deleted', async () => {
	fetchMock.mockResolvedValueOnce(Response.json({ detail: 'Macro not found' }, { status: 404 }));
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacros());
	const dialog = await editMacros(user);
	await user.click(within(dialog).getByRole('button', { name: 'Delete lift' }));

	await user.click(within(dialog).getByRole('button', { name: 'Save' }));

	const list = await screen.findByRole('dialog', { name: 'Macros' });
	await waitFor(() => expect(macroNames(list)).toEqual(['punch']));
});

test('a failed delete stops there, keeping the rest marked and saying which', async () => {
	fetchMock
		.mockResolvedValueOnce(new Response(null, { status: 204 }))
		.mockResolvedValueOnce(Response.json({ detail: 'Not found' }, { status: 404 }));
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	const char = withMacros();
	const lift = char.macros?.[0];
	if (lift) char.macros?.push({ ...lift, name: 'sneak' });
	renderOwnerPage(char);
	const dialog = await editMacros(user);
	for (const name of ['lift', 'punch', 'sneak']) {
		await user.click(within(dialog).getByRole('button', { name: `Delete ${name}` }));
	}

	await user.click(within(dialog).getByRole('button', { name: 'Save' }));

	expect(await within(dialog).findByRole('alert')).toHaveTextContent(
		"Couldn’t delete punch. This character no longer exists, or you're no longer in its server."
	);
	expect(requests()).toHaveLength(2);
	// Still editing, with punch and sneak still marked; Cancel brings them back, but not lift
	expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled();
	await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
	const list = await screen.findByRole('dialog', { name: 'Macros' });
	await waitFor(() => expect(macroNames(list)).toEqual(['punch', 'sneak']));
});

test('a non-supporter who clicks Edit gets the upsell', async () => {
	const user = userEvent.setup();
	isSupporter.mockResolvedValue(false);
	navigate('/char?macros=panel');
	renderOwnerPage(withMacros());
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);

	await user.click(screen.getByRole('button', { name: 'Edit macros' }));

	await waitFor(() => expect(upsell.open).toBe(true));
	expect(upsell.feature).toBe('Editing macros');
	expect(screen.queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument();
});

test('deleting every macro says saving deletes them all', async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacro());
	const dialog = await editMacros(user);

	await user.click(within(dialog).getByRole('button', { name: 'Delete lift' }));

	expect(
		await within(dialog).findByText('Saving will delete all of the macros.')
	).toBeInTheDocument();
});

/** Open macro editing on two macros and mark "lift" for deletion, returning the panel. */
const markLift = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
	navigate('/char?macros=panel');
	renderOwnerPage(withMacros());
	const dialog = await editMacros(user);
	await user.click(within(dialog).getByRole('button', { name: 'Delete lift' }));
	return dialog;
};

test.each<
	[string, (user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) => Promise<void>]
>([
	['Cancel', (user, dialog) => user.click(within(dialog).getByRole('button', { name: 'Cancel' }))],
	['Escape', (user) => user.keyboard('{Escape}')],
	['✕', (user, dialog) => user.click(within(dialog).getByRole('button', { name: 'Close macros' }))]
])('leaving macro editing with deletions by %s asks first', async (_, leave) => {
	const user = userEvent.setup();
	const dialog = await markLift(user);
	vi.mocked(window.confirm).mockReturnValueOnce(false);

	await leave(user, dialog);

	expect(window.confirm).toHaveBeenCalledWith('Discard your unsaved changes?');
	// Declined: still editing, lift still marked
	expect(screen.getByRole('dialog', { name: 'Edit Macros' })).toBe(dialog);
	expect(macroNames(dialog)).toEqual(['punch']);

	// Agreed: the deletions are discarded
	await leave(user, dialog);
	expect(window.confirm).toHaveBeenCalledTimes(2);
	await waitFor(() =>
		expect(screen.queryByRole('dialog', { name: 'Edit Macros' })).not.toBeInTheDocument()
	);
	expect(fetchMock).not.toHaveBeenCalled();
});

test("leaving macro editing without changes doesn't ask", async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacros());
	const dialog = await editMacros(user);

	await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
	await user.click(screen.getByRole('button', { name: 'Close macros' }));

	expect(window.confirm).not.toHaveBeenCalled();
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

/** Open the new macro form (in ?macros=panel mode), returning the panel. */
const addMacroForm = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
	navigate('/char?macros=panel');
	renderOwnerPage(withMacros());
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	await user.click(screen.getByRole('button', { name: 'Add macro' }));
	return screen.findByRole('dialog', { name: 'New Macro' });
};

test.each<
	[string, (user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) => Promise<void>]
>([
	['Cancel', (user, dialog) => user.click(within(dialog).getByRole('button', { name: 'Cancel' }))],
	['Escape', (user) => user.keyboard('{Escape}')],
	['✕', (user, dialog) => user.click(within(dialog).getByRole('button', { name: 'Close macros' }))]
])('leaving a new macro with input by %s asks first', async (_, exit) => {
	const user = userEvent.setup();
	const dialog = await addMacroForm(user);
	await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'feed');
	vi.mocked(window.confirm).mockReturnValueOnce(false);

	await exit(user, dialog);

	expect(window.confirm).toHaveBeenCalledWith('Discard your unsaved changes?');
	expect(screen.getByRole('dialog', { name: 'New Macro' })).toBe(dialog);
	expect(within(dialog).getByRole('textbox', { name: 'Name' })).toHaveValue('feed');

	await exit(user, dialog);
	await waitFor(() =>
		expect(screen.queryByRole('dialog', { name: 'New Macro' })).not.toBeInTheDocument()
	);
});

test('a toggled option counts as input', async () => {
	const user = userEvent.setup();
	const dialog = await addMacroForm(user);
	await user.click(within(dialog).getByRole('button', { name: 'More Difficulty' }));

	await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

	expect(window.confirm).toHaveBeenCalledOnce();
});

test("leaving a blank new macro doesn't ask", async () => {
	const user = userEvent.setup();
	const dialog = await addMacroForm(user);

	await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

	expect(window.confirm).not.toHaveBeenCalled();
	expect(await screen.findByRole('dialog', { name: 'Macros' })).toBeInTheDocument();
});

test('leaving the page with unsaved macro deletions asks first', async () => {
	const user = userEvent.setup();
	await markLift(user);

	vi.mocked(window.confirm).mockReturnValueOnce(false);
	expect(leave('link')).toBe(true);
	expect(window.confirm).toHaveBeenCalledWith('Discard your unsaved changes?');

	// The browser asks for itself when the tab closes or the site's left
	expect(leave('leave', null)).toBe(true);

	expect(leave('link')).toBe(false); // Agreed
});

test('leaving the page with a new macro in progress asks first', async () => {
	const user = userEvent.setup();
	const dialog = await addMacroForm(user);
	await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'feed');

	vi.mocked(window.confirm).mockReturnValueOnce(false);
	expect(leave('link')).toBe(true);
});

test("leaving the page with the macro panel open but nothing unsaved doesn't ask", async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacros());
	await editMacros(user);

	expect(leave('link')).toBe(false);
	expect(window.confirm).not.toHaveBeenCalled();
});

test("the strip's Cancel asks about a new macro, and leaving it starts the next one full", async () => {
	const user = userEvent.setup();
	const dialog = await addMacroForm(user);
	await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'feed');
	await user.click(within(dialog).getByRole('button', { name: 'Pick traits' }));
	expect(screen.getByRole('dialog', { name: 'New Macro' })).toBe(dialog);

	await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

	expect(window.confirm).toHaveBeenCalledOnce();
	await user.click(await screen.findByRole('button', { name: 'Add macro' }));
	const next = await screen.findByRole('dialog', { name: 'New Macro' });
	expect(within(next).getByRole('textbox', { name: 'Name' })).toHaveValue('');
});

test("the New Macro form makes the sheet's traits choices, and picking one collapses it", async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacros());
	expect(screen.queryByRole('button', { name: 'Pick Strength' })).not.toBeInTheDocument();

	const dialog = await addMacroForm(user);
	await user.click(screen.getByRole('button', { name: 'Pick Strength' }));

	expect(screen.getByRole('dialog', { name: 'New Macro' })).toBe(dialog);
	expect(within(dialog).queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
	expect(within(dialog).getByRole('form')).toHaveTextContent('Strength');
	expect(within(dialog).getByRole('form')).toHaveTextContent('2 dice');
});

test('leaving the New Macro form ends picking and drops the picks', async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacros());
	await addMacroForm(user);
	await user.click(screen.getByRole('button', { name: 'Pick Strength' }));

	await user.keyboard('{Escape}'); // Asks (agreed), then back to the list
	await screen.findByRole('dialog', { name: 'Macros' });
	expect(screen.queryByRole('button', { name: 'Pick Strength' })).not.toBeInTheDocument();

	await user.click(screen.getByRole('button', { name: 'Add macro' }));
	const next = await screen.findByRole('dialog', { name: 'New Macro' });
	expect(within(next).getByRole('form')).toHaveTextContent(
		'Click traits on the sheet to build the pool.'
	);
	expect(screen.getByRole('button', { name: 'Pick Strength' })).toHaveAttribute(
		'aria-pressed',
		'false'
	);
});

test('adding sends the picked pool', async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacros());
	const dialog = await addMacroForm(user);
	await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'lift_more');
	await user.click(screen.getByRole('button', { name: 'Pick Strength' }));
	await user.click(within(dialog).getByRole('button', { name: 'Done' }));

	await user.click(within(dialog).getByRole('button', { name: 'Add Macro' }));

	const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
		macros: { name: string; pool: string[] }[];
	};
	expect(body.macros.find((macro) => macro.name === 'lift_more')?.pool).toEqual(['Strength']);
});

test('a trait subtracted from the bar is saved with a minus', async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	const char = withMacros();
	char.traits.push({ name: 'Obvious Predator', rating: 2, type: 'custom', subtraits: [] });
	renderOwnerPage(char);
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	await user.click(screen.getByRole('button', { name: 'Add macro' }));
	const dialog = await screen.findByRole('dialog', { name: 'New Macro' });
	await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'hunt_mortal');
	await user.click(screen.getByRole('button', { name: 'Pick Strength' }));
	await user.click(screen.getByRole('button', { name: 'Pick Obvious Predator' }));

	await user.click(within(dialog).getByRole('button', { name: 'Subtract Obvious Predator' }));
	expect(within(dialog).getByRole('form')).toHaveTextContent('1 die'); // 2 - 2, but the bot rolls at least 1
	await user.click(within(dialog).getByRole('button', { name: 'Done' }));
	await user.click(within(dialog).getByRole('button', { name: 'Add Macro' }));

	const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
		macros: { name: string; pool: string[] }[];
	};
	expect(body.macros.find((macro) => macro.name === 'hunt_mortal')?.pool).toEqual([
		'Strength',
		'-',
		'Obvious Predator'
	]);
});

test("a macro's Edit opens its form with its pool picked on the sheet; saving returns to editing", async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	const char = withMacros();
	char.traits.push({ name: 'Dexterity', rating: 3, type: 'attribute', subtraits: [] });
	renderOwnerPage(char);
	const panel = await editMacros(user);

	await user.click(within(panel).getByRole('button', { name: 'Edit lift' }));

	const dialog = await screen.findByRole('dialog', { name: 'Edit Macro' });
	expect(within(dialog).getByRole('textbox', { name: 'Name' })).toHaveValue('lift');
	expect(screen.getByRole('button', { name: 'Pick Strength' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await user.click(screen.getByRole('button', { name: 'Pick Dexterity' }));
	await user.click(within(dialog).getByRole('button', { name: 'Done' }));
	await user.click(within(dialog).getByRole('button', { name: 'Save Macro' }));

	const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
		macros: { name: string; pool: string[] }[];
	};
	expect(body.macros.map((macro) => [macro.name, macro.pool])).toEqual([
		['lift', ['Strength', '+', 'Dexterity', '+', '2']],
		['punch', ['Strength', '+', '2']]
	]);
	await screen.findByRole('dialog', { name: 'Edit Macros' });
	expect(screen.queryByRole('button', { name: 'Pick Strength' })).not.toBeInTheDocument();
});

test("Escape backs out of a macro's form to editing", async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacros());
	const panel = await editMacros(user);
	await user.click(within(panel).getByRole('button', { name: 'Edit punch' }));
	await screen.findByRole('dialog', { name: 'Edit Macro' });

	await user.keyboard('{Escape}');

	await screen.findByRole('dialog', { name: 'Edit Macros' });
	expect(fetchMock).not.toHaveBeenCalled();
});

test('editing a macro with deletions marked asks first, keeping them if declined', async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacros());
	const panel = await editMacros(user);
	await user.click(within(panel).getByRole('button', { name: 'Delete punch' }));
	const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

	await user.click(within(panel).getByRole('button', { name: 'Edit lift' }));

	expect(confirm).toHaveBeenCalledWith('Discard your unsaved changes?');
	expect(screen.getByRole('dialog', { name: 'Edit Macros' })).toBeInTheDocument();
	expect(within(panel).getByRole('button', { name: 'Save' })).toBeEnabled();
});

test("hovering a macro in the panel highlights its traits on the sheet, until it's left", async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	const { container } = renderOwnerPage(withMacros());
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	const lift = await screen.findByRole('article', { name: 'lift' });
	const highlighted = (): string[] =>
		[...container.querySelectorAll('[data-highlight]')].map((el) => el.textContent?.trim() ?? '');

	await user.hover(lift);
	await waitFor(() => expect(highlighted()).toEqual([expect.stringContaining('Strength')]));

	await user.unhover(lift);
	await waitFor(() => expect(highlighted()).toEqual([]));
});

test('Willpower and Humanity are picked from their trackers, by the names the bot rolls', async () => {
	const user = userEvent.setup();
	navigate('/char?macros=panel');
	renderOwnerPage(withMacros());
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	await user.click(screen.getByRole('button', { name: 'Add macro' }));
	const dialog = await screen.findByRole('dialog', { name: 'New Macro' });
	await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'resist');
	await user.click(screen.getByRole('button', { name: 'Pick Willpower' }));
	await user.click(screen.getByRole('button', { name: 'Pick Humanity' }));
	expect(screen.queryByRole('button', { name: 'Pick Health' })).not.toBeInTheDocument();

	await user.click(within(dialog).getByRole('button', { name: 'Done' }));
	await user.click(within(dialog).getByRole('button', { name: 'Add Macro' }));

	const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
		macros: { name: string; pool: string[] }[];
	};
	expect(body.macros.find((macro) => macro.name === 'resist')?.pool).toEqual([
		'Willpower',
		'+',
		'Humanity'
	]);
});

test("removing a trait a macro rolls warns which macros won't roll without it", async () => {
	const user = userEvent.setup();
	toaster.warning.mockClear();
	const char = withMacros();
	char.traits.push(
		{ name: 'Obvious Predator', rating: 2, type: 'custom', subtraits: [] },
		{ name: 'Night Driving', rating: 1, type: 'custom', subtraits: [] }
	);
	const [lift, punch] = char.macros ?? [];
	char.macros = [
		{ ...lift, pool: ['Strength', '-', 'ObviousPredator'] },
		{ ...punch, pool: ['Strength', '-', 'Obvious Predator'] }
	];
	renderOwnerPage(char);
	await user.click(editButton('Edit'));

	await user.click(screen.getByRole('button', { name: 'Remove Night Driving' }));
	expect(toaster.warning).not.toHaveBeenCalled();

	await user.click(screen.getByRole('button', { name: 'Remove Obvious Predator' }));
	expect(toaster.warning).toHaveBeenCalledExactlyOnceWith({
		title: 'Obvious Predator is in macros',
		description: 'lift and punch won’t roll without it.',
		duration: 8000
	});

	// Cancel brings it back, quietly
	await user.click(editButton('Cancel'));
	expect(toaster.warning).toHaveBeenCalledOnce();
});
