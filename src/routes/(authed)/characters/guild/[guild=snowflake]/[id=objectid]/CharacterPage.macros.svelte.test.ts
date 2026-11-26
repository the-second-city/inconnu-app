import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import type { Character } from '$lib/types';
import { navigate } from '$lib/testing/page.svelte';
import { TEST_CONSTRAINTS } from '$lib/testing/constraints';
import CharacterPage from './CharacterPage.svelte';
import {
	character,
	editButton,
	GUILD,
	leaveVia,
	panel,
	reduceMotion,
	renderOwnerPage,
	renderPage
} from './testing';
import { upsell } from '$lib/state/premium.svelte';

// The macros on the character page: the macro panel, and picking pools from the sheet

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
	reduceMotion(true);
});

/** Navigate away as SvelteKit would, through the page's beforeNavigate. Returns whether the
 * navigation was cancelled. */
const leave = (type: string, toPath?: string | null): boolean =>
	leaveVia(navigation.before, type, toPath);

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

test('the macros are in the panel, not on the sheet', async () => {
	const user = userEvent.setup();
	renderOwnerPage(withMacro());
	expect(within(panel()).queryByRole('region', { name: 'Macros' })).not.toBeInTheDocument();

	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);

	const dialog = screen.getByRole('dialog', { name: 'Macros' });
	expect(within(dialog).getByRole('article', { name: 'lift' })).toHaveTextContent('4 dice');
});

test('the Macros button opens and closes a panel of them', async () => {
	const user = userEvent.setup();
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

test('an editor without macros can open the panel to add one', async () => {
	const user = userEvent.setup();
	renderOwnerPage();

	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);

	const dialog = screen.getByRole('dialog', { name: 'Macros' });
	expect(dialog).toHaveTextContent('No macros yet.');
	expect(within(dialog).getByRole('button', { name: 'Add macro' })).toBeInTheDocument();
});

test("a Storyteller on a player's character gets no Macros button without macros, nor Add", async () => {
	const user = userEvent.setup();
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
	renderOwnerPage(withMacro());
	const toggle = screen.getAllByRole('button', { name: 'Macros' })[0];
	await user.click(toggle);
	await user.click(screen.getByRole('button', { name: 'Add macro' }));
	await user.click(
		within(await screen.findByRole('dialog', { name: 'New Macro' })).getByRole('button', {
			name: 'Skip pool'
		})
	);

	await user.click(screen.getByRole('button', { name: 'Close macros' }));
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	await user.click(toggle);

	expect(await screen.findByRole('dialog', { name: 'Macros' })).toBeInTheDocument();
});

test('a non-supporter who clicks Add gets the upsell', async () => {
	const user = userEvent.setup();
	isSupporter.mockResolvedValue(false);
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

/** Open the macro panel and switch it to editing, returning the panel. */
const editMacros = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	await user.click(screen.getByRole('button', { name: 'Edit macros' }));
	return screen.findByRole('dialog', { name: 'Edit Macros' });
};

/** The macro names in the panel, less those marked for deletion (which have an Undo). */
const macroNames = (dialog: HTMLElement): string[] =>
	within(dialog)
		.queryAllByRole('article')
		.map((article) => article.getAttribute('aria-label') ?? '')
		.filter((name) => !within(dialog).queryByRole('button', { name: `Undo deleting ${name}` }));

test('editing macros swaps Add and Edit for Cancel and Save, and offers to delete each', async () => {
	const user = userEvent.setup();
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
	renderOwnerPage();

	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);

	expect(screen.getByRole('button', { name: 'Add macro' })).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Edit macros' })).not.toBeInTheDocument();
});

test('a deleted macro comes back on Cancel, without saving', async () => {
	const user = userEvent.setup();
	renderOwnerPage(withMacros());
	const dialog = await editMacros(user);

	await user.click(within(dialog).getByRole('button', { name: 'Delete lift' }));
	await waitFor(() => expect(macroNames(dialog)).toEqual(['punch']));
	expect(within(dialog).getByRole('button', { name: 'Delete 1' })).toBeEnabled();

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
	const { rerender } = renderOwnerPage(withMacros());
	const dialog = await editMacros(user);

	await user.click(within(dialog).getByRole('button', { name: 'Delete lift' }));
	await user.click(within(dialog).getByRole('button', { name: 'Delete punch' }));
	await user.click(within(dialog).getByRole('button', { name: 'Delete 2' }));

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
	renderOwnerPage(withMacros());
	const dialog = await editMacros(user);
	await user.click(within(dialog).getByRole('button', { name: 'Delete lift' }));
	await user.click(within(dialog).getByRole('button', { name: 'Delete punch' }));

	await user.click(within(dialog).getByRole('button', { name: 'Delete 2' }));
	expect(requests()).toHaveLength(1);

	finishFirst(new Response(null, { status: 204 }));
	await waitFor(() => expect(requests()).toHaveLength(2));
});

test('a macro already gone counts as deleted', async () => {
	fetchMock.mockResolvedValueOnce(Response.json({ detail: 'Macro not found' }, { status: 404 }));
	const user = userEvent.setup();
	renderOwnerPage(withMacros());
	const dialog = await editMacros(user);
	await user.click(within(dialog).getByRole('button', { name: 'Delete lift' }));

	await user.click(within(dialog).getByRole('button', { name: 'Delete 1' }));

	const list = await screen.findByRole('dialog', { name: 'Macros' });
	await waitFor(() => expect(macroNames(list)).toEqual(['punch']));
});

test('a failed delete stops there, keeping the rest marked and saying which', async () => {
	fetchMock
		.mockResolvedValueOnce(new Response(null, { status: 204 }))
		.mockResolvedValueOnce(Response.json({ detail: 'Not found' }, { status: 404 }));
	const user = userEvent.setup();
	const char = withMacros();
	const lift = char.macros?.[0];
	if (lift) char.macros?.push({ ...lift, name: 'sneak' });
	renderOwnerPage(char);
	const dialog = await editMacros(user);
	for (const name of ['lift', 'punch', 'sneak']) {
		await user.click(within(dialog).getByRole('button', { name: `Delete ${name}` }));
	}

	await user.click(within(dialog).getByRole('button', { name: 'Delete 3' }));

	expect(await within(dialog).findByRole('alert')).toHaveTextContent(
		"Couldn’t delete punch. This character no longer exists, or you're no longer in its server."
	);
	expect(requests()).toHaveLength(2);
	// Still editing, with punch and sneak still marked; Cancel brings them back, but not lift
	expect(within(dialog).getByRole('button', { name: 'Delete 2' })).toBeEnabled();
	await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
	const list = await screen.findByRole('dialog', { name: 'Macros' });
	await waitFor(() => expect(macroNames(list)).toEqual(['punch', 'sneak']));
});

test('a non-supporter who clicks Edit gets the upsell', async () => {
	const user = userEvent.setup();
	isSupporter.mockResolvedValue(false);
	renderOwnerPage(withMacros());
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);

	await user.click(screen.getByRole('button', { name: 'Edit macros' }));

	await waitFor(() => expect(upsell.open).toBe(true));
	expect(upsell.feature).toBe('Editing macros');
	expect(screen.queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument();
});

test('deleting every macro says saving deletes them all', async () => {
	const user = userEvent.setup();
	renderOwnerPage(withMacro());
	const dialog = await editMacros(user);

	await user.click(within(dialog).getByRole('button', { name: 'Delete lift' }));

	expect(
		await within(dialog).findByText('Saving will delete all of the macros.')
	).toBeInTheDocument();
});

/** Open macro editing on two macros and mark "lift" for deletion, returning the panel. */
const markLift = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
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
	renderOwnerPage(withMacros());
	const dialog = await editMacros(user);

	await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
	await user.click(screen.getByRole('button', { name: 'Close macros' }));

	expect(window.confirm).not.toHaveBeenCalled();
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

/** Open the new macro form, returning the panel. */
const addMacroForm = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
	renderOwnerPage(withMacros());
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	await user.click(screen.getByRole('button', { name: 'Add macro' }));
	const dialog = await screen.findByRole('dialog', { name: 'New Macro' });
	// It opens as the strip; Done opens the name and details
	await user.click(within(dialog).getByRole('button', { name: 'Skip pool' }));
	return dialog;
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
	renderOwnerPage(withMacros());
	await editMacros(user);

	expect(leave('link')).toBe(false);
	expect(window.confirm).not.toHaveBeenCalled();
});

test("the strip's Cancel asks about a new macro, and the next one starts afresh, as the strip", async () => {
	const user = userEvent.setup();
	const dialog = await addMacroForm(user);
	await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'feed');
	await user.click(within(dialog).getByRole('button', { name: 'Pick traits' }));
	expect(screen.getByRole('dialog', { name: 'New Macro' })).toBe(dialog);

	await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

	expect(window.confirm).toHaveBeenCalledOnce();
	await user.click(await screen.findByRole('button', { name: 'Add macro' }));
	const next = await screen.findByRole('dialog', { name: 'New Macro' });
	expect(within(next).queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
	await user.click(within(next).getByRole('button', { name: 'Skip pool' }));
	expect(within(next).getByRole('textbox', { name: 'Name' })).toHaveValue('');
});

test("the New Macro form makes the sheet's traits choices, and picking one collapses it", async () => {
	const user = userEvent.setup();
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
	renderOwnerPage(withMacros());
	const dialog = await addMacroForm(user);
	await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'lift_more');
	await user.click(screen.getByRole('button', { name: 'Pick Strength' }));
	await user.click(within(dialog).getByRole('button', { name: 'Continue' }));

	await user.click(within(dialog).getByRole('button', { name: 'Add Macro' }));

	const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
		name: string;
		pool: string[];
	};
	expect(body.name).toBe('lift_more');
	expect(body.pool).toEqual(['Strength']);
});

test('a trait subtracted from the bar is saved with a minus', async () => {
	const user = userEvent.setup();
	const char = withMacros();
	char.traits.push({ name: 'Obvious Predator', rating: 2, type: 'custom', subtraits: [] });
	renderOwnerPage(char);
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	await user.click(screen.getByRole('button', { name: 'Add macro' }));
	const dialog = await screen.findByRole('dialog', { name: 'New Macro' });
	await user.click(within(dialog).getByRole('button', { name: 'Skip pool' }));
	await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'hunt_mortal');
	await user.click(screen.getByRole('button', { name: 'Pick Strength' }));
	await user.click(screen.getByRole('button', { name: 'Pick Obvious Predator' }));

	await user.click(within(dialog).getByRole('button', { name: 'Subtract Obvious Predator' }));
	expect(within(dialog).getByRole('form')).toHaveTextContent('1 die'); // 2 - 2, but the bot rolls at least 1
	await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
	await user.click(within(dialog).getByRole('button', { name: 'Add Macro' }));

	const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
		name: string;
		pool: string[];
	};
	expect(body.name).toBe('hunt_mortal');
	expect(body.pool).toEqual(['Strength', '-', 'Obvious Predator']);
});

test("a macro's Edit opens its form with its pool picked on the sheet; saving returns to editing", async () => {
	const user = userEvent.setup();
	const char = withMacros();
	char.traits.push({ name: 'Dexterity', rating: 3, type: 'attribute', subtraits: [] });
	renderOwnerPage(char);
	const panel = await editMacros(user);

	await user.click(within(panel).getByRole('button', { name: 'Edit lift' }));

	const dialog = await screen.findByRole('dialog', { name: 'Edit lift' });
	expect(within(dialog).getByRole('textbox', { name: 'Name' })).toHaveValue('lift');
	expect(screen.getByRole('button', { name: 'Pick Strength' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await user.click(screen.getByRole('button', { name: 'Pick Dexterity' }));
	await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
	await user.click(within(dialog).getByRole('button', { name: 'Save Macro' }));

	const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
		name: string;
		pool: string[];
	};
	expect(requests()).toEqual(['PUT /api/characters/id/macros/lift']);
	expect(body).toMatchObject({ name: 'lift', pool: ['Strength', '+', 'Dexterity', '+', '2'] });
	await screen.findByRole('dialog', { name: 'Edit Macros' });
	expect(screen.queryByRole('button', { name: 'Pick Strength' })).not.toBeInTheDocument();
});

test("Escape backs out of a macro's form to editing", async () => {
	const user = userEvent.setup();
	renderOwnerPage(withMacros());
	const panel = await editMacros(user);
	await user.click(within(panel).getByRole('button', { name: 'Edit punch' }));
	await screen.findByRole('dialog', { name: 'Edit punch' });

	await user.keyboard('{Escape}');

	await screen.findByRole('dialog', { name: 'Edit Macros' });
	expect(fetchMock).not.toHaveBeenCalled();
});

test('editing a macro with deletions marked asks first, keeping them if declined', async () => {
	const user = userEvent.setup();
	renderOwnerPage(withMacros());
	const panel = await editMacros(user);
	await user.click(within(panel).getByRole('button', { name: 'Delete punch' }));
	const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

	await user.click(within(panel).getByRole('button', { name: 'Edit lift' }));

	expect(confirm).toHaveBeenCalledWith('Discard your unsaved changes?');
	expect(screen.getByRole('dialog', { name: 'Edit Macros' })).toBeInTheDocument();
	expect(within(panel).getByRole('button', { name: 'Delete 1' })).toBeEnabled();
});

test("hovering a macro in the panel highlights its traits on the sheet, until it's left", async () => {
	const user = userEvent.setup();
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
	renderOwnerPage(withMacros());
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	await user.click(screen.getByRole('button', { name: 'Add macro' }));
	const dialog = await screen.findByRole('dialog', { name: 'New Macro' });
	await user.click(within(dialog).getByRole('button', { name: 'Skip pool' }));
	await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'resist');
	await user.click(screen.getByRole('button', { name: 'Pick Willpower' }));
	await user.click(screen.getByRole('button', { name: 'Pick Humanity' }));
	expect(screen.queryByRole('button', { name: 'Pick Health' })).not.toBeInTheDocument();

	await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
	await user.click(within(dialog).getByRole('button', { name: 'Add Macro' }));

	const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
		name: string;
		pool: string[];
	};
	expect(body.name).toBe('resist');
	expect(body.pool).toEqual(['Willpower', '+', 'Humanity']);
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

test('clicking outside the panel closes it while viewing, not while editing or adding', async () => {
	const user = userEvent.setup();
	renderOwnerPage(withMacros());
	const toggle = screen.getAllByRole('button', { name: 'Macros' })[0];
	await user.click(toggle);
	const dialog = screen.getByRole('dialog', { name: 'Macros' });

	await user.click(within(dialog).getByRole('article', { name: 'lift' }));
	expect(screen.getByRole('dialog', { name: 'Macros' })).toBe(dialog);

	await user.click(document.body);
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

	for (const [button, title] of [
		['Edit macros', 'Edit Macros'],
		['Add macro', 'New Macro']
	]) {
		await waitFor(() => expect(toggle).toBeEnabled());
		await user.click(toggle);
		await user.click(screen.getByRole('button', { name: button }));
		await screen.findByRole('dialog', { name: title });
		await user.click(document.body);
		expect(screen.getByRole('dialog', { name: title })).toBeInTheDocument();
		await user.keyboard('{Escape}');
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	}
});

test("the phone's floating buttons make way while the macro panel is open", async () => {
	const user = userEvent.setup();
	renderOwnerPage(withMacros());
	// Wide windows' buttons, and the phone's floating ones
	expect(screen.getAllByRole('button', { name: 'Macros' })).toHaveLength(2);
	expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2);

	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);

	await waitFor(() => expect(screen.getAllByRole('button', { name: 'Macros' })).toHaveLength(1));
	expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(1);
	await user.click(screen.getByRole('button', { name: 'Close macros' }));
	await waitFor(() => expect(screen.getAllByRole('button', { name: 'Macros' })).toHaveLength(2));
});

test('a macro marked for deletion stays, struck through, and Undo brings it back', async () => {
	const user = userEvent.setup();
	renderOwnerPage(withMacros());
	const dialog = await editMacros(user);

	await user.click(within(dialog).getByRole('button', { name: 'Delete lift' }));

	expect(within(dialog).getByRole('article', { name: 'lift' })).toBeInTheDocument();
	expect(within(dialog).getByText('Will be deleted')).toBeInTheDocument();
	await waitFor(() =>
		expect(within(dialog).queryByRole('button', { name: 'Edit lift' })).not.toBeInTheDocument()
	);
	expect(within(dialog).getByRole('button', { name: 'Delete 1' })).toBeEnabled();

	await user.click(within(dialog).getByRole('button', { name: 'Undo deleting lift' }));

	expect(macroNames(dialog)).toEqual(['lift', 'punch']);
	expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled();
});

test('the panel fades out before the strip fades in, and back', async () => {
	reduceMotion(false);
	const user = userEvent.setup();
	renderOwnerPage(withMacros());
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	const dialog = screen.getByRole('dialog', { name: 'Macros' });

	await user.click(screen.getByRole('button', { name: 'Add macro' }));

	// Still the panel, fading; then the strip
	expect(within(dialog).queryByRole('button', { name: 'Skip pool' })).not.toBeInTheDocument();
	await within(dialog).findByRole('button', { name: 'Skip pool' });
	await user.click(within(dialog).getByRole('button', { name: 'Skip pool' }));
	expect(within(dialog).queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
	expect(await within(dialog).findByRole('textbox', { name: 'Name' })).toBeInTheDocument();
});

test('the strip sets the modifier too, which the form keeps', async () => {
	const user = userEvent.setup();
	renderOwnerPage(withMacros());
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	await user.click(screen.getByRole('button', { name: 'Add macro' }));
	const dialog = await screen.findByRole('dialog', { name: 'New Macro' });
	const modifier = within(dialog).getByRole('group', { name: 'Modifier' });
	expect(within(dialog).getByRole('button', { name: 'Less Modifier' })).toBeDisabled();

	await user.click(screen.getByRole('button', { name: 'Pick Strength' }));
	await user.click(within(dialog).getByRole('button', { name: 'Less Modifier' }));

	expect(modifier).toHaveTextContent('−1');
	expect(modifier).toHaveAccessibleDescription('Subtracts 1 die');
	// The number has no chip in the strip: the modifier shows it
	expect(
		within(within(dialog).getByRole('list', { name: 'Pool' })).getAllByRole('listitem')
	).toHaveLength(1);

	await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
	expect(within(dialog).getByRole('group', { name: 'Modifier' })).toHaveAccessibleDescription(
		'Subtracts 1 die'
	);
});

test("on phones, the panel's handle steps its height with the arrow keys", async () => {
	const user = userEvent.setup();
	renderOwnerPage(withMacros());
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	const handle = screen.getByRole('slider', { name: 'Macros panel height' });
	handle.focus();

	await user.keyboard('{ArrowUp}');
	expect(handle).toHaveAttribute('aria-valuenow', '35');
	await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
	expect(handle).toHaveAttribute('aria-valuetext', '90% of the screen');
	await user.keyboard('{ArrowDown}');
	expect(handle).toHaveAttribute('aria-valuenow', '60');
});

/**
 * Open the macro panel in a wide window (where it moves and resizes), laid out at (600, 240), 384
 * by 400 (jsdom lays nothing out). Returns the panel and its heading, which drags it.
 */
const openWide = async (
	user: ReturnType<typeof userEvent.setup>
): Promise<{ dialog: HTMLElement; heading: HTMLElement }> => {
	window.matchMedia = ((query: string) =>
		({
			matches: query.includes('min-width'),
			media: query
		}) as MediaQueryList) as typeof window.matchMedia;
	renderOwnerPage(withMacros());
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	const dialog = screen.getByRole('dialog', { name: 'Macros' });
	dialog.getBoundingClientRect = () =>
		DOMRect.fromRect({ x: 600, y: 240, width: 384, height: 400 });
	return { dialog, heading: within(dialog).getByRole('heading', { name: 'Macros' }) };
};

/** The panel's placement, as its style gives it: where its top left is, and its size. */
const placement = (dialog: HTMLElement): Record<string, string> =>
	Object.fromEntries(
		['top', 'left', 'width', 'height', 'bottom'].map((name) => [
			name,
			dialog.style.getPropertyValue(`--float-${name}`)
		])
	);

test('on wider windows, dragging the header moves the panel, and double-clicking puts it back', async () => {
	const user = userEvent.setup();
	const { dialog, heading } = await openWide(user);
	expect(placement(dialog).top).toBe('');

	await user.pointer([
		{ keys: '[MouseLeft>]', target: heading, coords: { clientX: 700, clientY: 260 } },
		{ target: heading, coords: { clientX: 600, clientY: 160 } },
		{ keys: '[/MouseLeft]', target: heading, coords: { clientX: 600, clientY: 160 } }
	]);
	// Fitting its content still, so no height
	expect(placement(dialog)).toEqual({
		top: '140px',
		left: '500px',
		width: '384px',
		height: '',
		bottom: ''
	});

	await user.dblClick(heading);
	expect(placement(dialog).top).toBe('');
});

test("on wider windows, the panel's corner resizes it with the arrow keys", async () => {
	const user = userEvent.setup();
	const { dialog } = await openWide(user);
	within(dialog).getByRole('button', { name: 'Resize the macros panel' }).focus();

	await user.keyboard('{ArrowDown}');
	expect(placement(dialog)).toMatchObject({ top: '240px', width: '384px', height: '440px' });
	// Narrower (from its laid-out size: jsdom's doesn't follow), it still has the height it was given
	await user.keyboard('{ArrowLeft}');
	expect(placement(dialog)).toMatchObject({ width: '344px', height: '440px' });
});

test("dragging the handle snaps the panel's height, or below a fifth closes it", async () => {
	const user = userEvent.setup();
	renderOwnerPage(withMacros());
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	const handle = screen.getByRole('slider', { name: 'Macros panel height' });
	const height = window.innerHeight;

	/** Drag the handle from one height in the window to another. */
	const dragHandle = (from: number, to: number) =>
		user.pointer([
			{ keys: '[MouseLeft>]', target: handle, coords: { clientX: 10, clientY: from } },
			{ target: handle, coords: { clientX: 10, clientY: to } },
			{ keys: '[/MouseLeft]', target: handle, coords: { clientX: 10, clientY: to } }
		]);

	// jsdom has no layout, so the panel starts at 0 high: dragging up 65% of the window snaps to 60%
	await dragHandle(height, height * 0.35);
	expect(handle).toHaveAttribute('aria-valuenow', '60');

	await dragHandle(0, height);
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test('a save waits for the fresh macros, so the list it returns to has them', async () => {
	let arrive: () => void = () => {};
	invalidate.mockImplementationOnce(() => new Promise<void>((resolve) => (arrive = resolve)));
	const user = userEvent.setup();
	const { rerender } = renderOwnerPage(withMacros());
	const panel = await editMacros(user);
	await user.click(within(panel).getByRole('button', { name: 'Edit lift' }));
	const form = await screen.findByRole('dialog', { name: 'Edit lift' });
	await user.click(within(form).getByRole('button', { name: 'More Difficulty' }));

	await user.click(within(form).getByRole('button', { name: 'Save Macro' }));

	await waitFor(() => expect(invalidate).toHaveBeenCalledWith('app:character'));
	expect(screen.getByRole('dialog', { name: 'Edit lift' })).toBe(form);

	const fresh = withMacros();
	if (fresh.macros) fresh.macros[0].difficulty = 3;
	await rerender({ character: fresh });
	arrive();
	const list = await screen.findByRole('dialog', { name: 'Edit Macros' });
	expect(within(list).getByRole('article', { name: 'lift' })).toHaveTextContent('Difficulty 3');
});

test("a failed save doesn't refetch", async () => {
	fetchMock.mockResolvedValueOnce(Response.json({ detail: 'Nope' }, { status: 409 }));
	const user = userEvent.setup();
	const form = await addMacroForm(user);
	await user.type(within(form).getByRole('textbox', { name: 'Name' }), 'surge');
	await user.click(screen.getByRole('button', { name: 'Pick Strength' }));
	await user.click(within(form).getByRole('button', { name: 'Continue' }));

	await user.click(within(form).getByRole('button', { name: 'Add Macro' }));

	expect(await within(form).findByRole('alert')).toHaveTextContent('Nope');
	expect(invalidate).not.toHaveBeenCalled();
});

test('deleting refetches once, after the last delete', async () => {
	const user = userEvent.setup();
	renderOwnerPage(withMacros());
	const dialog = await editMacros(user);
	await user.click(within(dialog).getByRole('button', { name: 'Delete lift' }));
	await user.click(within(dialog).getByRole('button', { name: 'Delete punch' }));

	await user.click(within(dialog).getByRole('button', { name: 'Delete 2' }));

	await waitFor(() => expect(invalidate).toHaveBeenCalledOnce());
	expect(requests()).toHaveLength(2);
});

test("a macro being saved can't be discarded, or its pool changed, until it's done", async () => {
	let finish: (response: Response) => void = () => {};
	fetchMock.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
	const user = userEvent.setup();
	const char = withMacros();
	char.traits.push({ name: 'Dexterity', rating: 2, type: 'attribute', subtraits: [] });
	renderOwnerPage(char);
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	await user.click(screen.getByRole('button', { name: 'Add macro' }));
	const dialog = await screen.findByRole('dialog', { name: 'New Macro' });
	await user.click(screen.getByRole('button', { name: 'Pick Strength' }));
	await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
	await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'surge');
	await user.click(within(dialog).getByRole('button', { name: 'Add Macro' }));

	await user.keyboard('{Escape}');
	expect(within(dialog).getByRole('button', { name: 'Close macros' })).toBeDisabled();
	await user.click(screen.getByRole('button', { name: 'Pick Dexterity' }));

	expect(window.confirm).not.toHaveBeenCalled();
	expect(screen.getByRole('dialog', { name: 'New Macro' })).toBe(dialog);
	expect(within(dialog).queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'Pick Dexterity' })).toHaveAttribute(
		'aria-pressed',
		'false'
	);

	finish(new Response(null, { status: 204 }));
	await screen.findByRole('dialog', { name: 'Macros' });
	// Nothing's left held: the next macro can be picked and cancelled
	await user.click(screen.getByRole('button', { name: 'Add macro' }));
	await screen.findByRole('dialog', { name: 'New Macro' });
	await user.click(screen.getByRole('button', { name: 'Pick Dexterity' }));
	expect(screen.getByRole('button', { name: 'Pick Dexterity' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await user.keyboard('{Escape}');
	await screen.findByRole('dialog', { name: 'Macros' });
});

test("the last macro going away closes a Storyteller's panel, so Edit doesn't wait on it", async () => {
	const user = userEvent.setup();
	const { rerender } = renderPage(withMacro());
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	expect(editButton('Edit')).toBeDisabled();

	await rerender({ character: { ...withMacro(), macros: [] } });

	await waitFor(() => expect(editButton('Edit')).toBeEnabled());
	await rerender({ character: withMacro() });
	expect(screen.queryByRole('dialog', { name: 'Macros' })).not.toBeInTheDocument();
});

test("the Macros button waits for Edit's premium check, so both can't open", async () => {
	let answer: (supporter: boolean) => void = () => {};
	isSupporter.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
	const user = userEvent.setup();
	renderOwnerPage(withMacros());
	const toggle = screen.getAllByRole('button', { name: 'Macros' })[0];

	await user.click(editButton('Edit'));
	await user.click(toggle);
	expect(toggle).toBeDisabled();
	answer(true);

	expect(await screen.findAllByRole('button', { name: 'Save' })).not.toHaveLength(0);
	expect(screen.queryByRole('dialog', { name: 'Macros' })).not.toBeInTheDocument();
});

test("closing the panel during Add's premium check doesn't reopen it on the form", async () => {
	let answer: (supporter: boolean) => void = () => {};
	isSupporter.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
	const user = userEvent.setup();
	renderOwnerPage(withMacros());
	const toggle = screen.getAllByRole('button', { name: 'Macros' })[0];
	await user.click(toggle);
	await user.click(screen.getByRole('button', { name: 'Add macro' }));

	await user.keyboard('{Escape}');
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	answer(true);
	await waitFor(() => expect(toggle).toBeEnabled());
	await user.click(toggle);

	expect(screen.getByRole('dialog', { name: 'Macros' })).toBeInTheDocument();
});

test("while a pool is picked, Health isn't a button; it is again after", async () => {
	const user = userEvent.setup();
	render(CharacterPage, {
		constraints: TEST_CONSTRAINTS,
		guild: GUILD,
		character: withMacros(),
		editable: true,
		actionable: true,
		ownerActions: true
	});
	expect(screen.getByRole('button', { name: 'Health actions' })).toBeInTheDocument();

	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	await user.click(screen.getByRole('button', { name: 'Add macro' }));
	await screen.findByRole('dialog', { name: 'New Macro' });
	expect(screen.queryByRole('button', { name: 'Health actions' })).not.toBeInTheDocument();

	await user.keyboard('{Escape}');
	expect(await screen.findByRole('button', { name: 'Health actions' })).toBeInTheDocument();
});

test('reopening a form while it fades out starts it afresh, its pool loaded', async () => {
	const user = userEvent.setup();
	renderOwnerPage(withMacros());
	const panel = await editMacros(user);
	await user.click(within(panel).getByRole('button', { name: 'Edit lift' }));
	const name = await within(panel).findByRole('textbox', { name: 'Name' });
	await user.type(name, '_more');
	await waitFor(() => expect(within(panel).queryByRole('article')).not.toBeInTheDocument());

	await user.click(within(panel).getByRole('button', { name: 'Cancel' }));
	await user.click(within(panel).getByRole('button', { name: 'Edit lift' })); // Still fading

	await waitFor(() =>
		expect(within(panel).getAllByRole('textbox', { name: 'Name' })).toHaveLength(1)
	);
	expect(within(panel).getByRole('textbox', { name: 'Name' })).toHaveValue('lift');
	expect(within(panel).getByRole('button', { name: 'Remove Strength' })).toBeInTheDocument();
	expect(within(panel).getByRole('button', { name: 'Save Macro' })).toBeDisabled();
	// Nothing's left of the discarded change to ask about
	vi.mocked(window.confirm).mockClear();
	await user.click(within(panel).getByRole('button', { name: 'Close macros' }));
	expect(window.confirm).not.toHaveBeenCalled();
});

/** Open lift's form and change its comment, then have lift change elsewhere. Returns the panel. */
const changeElsewhere = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
	const { rerender } = renderOwnerPage(withMacros());
	const panel = await editMacros(user);
	await user.click(within(panel).getByRole('button', { name: 'Edit lift' }));
	await user.type(await within(panel).findByRole('textbox', { name: /Comment/ }), 'Mine');
	const fresh = withMacros();
	if (fresh.macros) fresh.macros[0].difficulty = 5;
	await rerender({ character: fresh });
	return panel;
};

test('a macro changed elsewhere holds the save; Keep Mine saves over it', async () => {
	const user = userEvent.setup();
	const panel = await changeElsewhere(user);
	expect(await within(panel).findByRole('alert')).toHaveTextContent(
		'lift changed while you were editing.'
	);
	expect(within(panel).getByRole('button', { name: 'Save Macro' })).toBeDisabled();

	await user.click(within(panel).getByRole('button', { name: 'Keep Mine' }));
	expect(within(panel).queryByRole('alert')).not.toBeInTheDocument();
	await user.click(within(panel).getByRole('button', { name: 'Save Macro' }));

	expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toMatchObject({
		comment: 'Mine',
		difficulty: 2
	});
});

test('Reload starts the edit over from the macro as it is now', async () => {
	const user = userEvent.setup();
	const panel = await changeElsewhere(user);

	await user.click(await within(panel).findByRole('button', { name: 'Reload' }));

	await waitFor(() =>
		expect(within(panel).getAllByRole('textbox', { name: /Comment/ })).toHaveLength(1)
	);
	expect(within(panel).getByRole('textbox', { name: /Comment/ })).toHaveValue('');
	expect(within(panel).getByRole('group', { name: 'Difficulty' })).toHaveTextContent('5');
	expect(within(panel).getByRole('button', { name: 'Remove Strength' })).toBeInTheDocument();
	expect(within(panel).queryByRole('alert')).not.toBeInTheDocument();
});

test('another macro changing elsewhere is no matter', async () => {
	const user = userEvent.setup();
	const { rerender } = renderOwnerPage(withMacros());
	const panel = await editMacros(user);
	await user.click(within(panel).getByRole('button', { name: 'Edit lift' }));
	await within(panel).findByRole('textbox', { name: 'Name' });
	const fresh = withMacros();
	if (fresh.macros) fresh.macros[1].difficulty = 5;

	await rerender({ character: fresh });

	expect(within(panel).queryByRole('alert')).not.toBeInTheDocument();
});

test('Add never focuses the name on the way to the strip, whose button takes the focus', async () => {
	reduceMotion(false);
	const focus = vi.spyOn(HTMLInputElement.prototype, 'focus');
	const user = userEvent.setup();
	renderOwnerPage(withMacros());
	await user.click(screen.getAllByRole('button', { name: 'Macros' })[0]);
	const dialog = screen.getByRole('dialog', { name: 'Macros' });

	await user.click(screen.getByRole('button', { name: 'Add macro' }));

	const skip = await within(dialog).findByRole('button', { name: 'Skip pool' });
	expect(skip).toHaveFocus();
	expect(focus).not.toHaveBeenCalled();
	await user.click(skip);
	expect(await within(dialog).findByRole('textbox', { name: 'Name' })).toHaveFocus();
});

test('collapsing the form by picking a trait leaves the focus on the sheet', async () => {
	const user = userEvent.setup();
	await addMacroForm(user);

	await user.click(screen.getByRole('button', { name: 'Pick Strength' }));

	await screen.findByRole('button', { name: 'Continue' });
	expect(screen.getByRole('button', { name: 'Pick Strength' })).toHaveFocus();
});
