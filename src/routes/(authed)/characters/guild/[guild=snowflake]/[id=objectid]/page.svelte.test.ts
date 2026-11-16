import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import type { Character, CharacterData, PublicCharacter } from '$lib/types';
import { navigate } from '$lib/testing/page.svelte';
import Page from './+page.svelte';
import type { PageProps } from './$types';

vi.mock('$app/state', () => import('$lib/testing/page.svelte'));
const invalidate = vi.hoisted(() => vi.fn());
const watchCharacter = vi.hoisted(() => vi.fn<(url: string, onChange: () => void) => () => void>());
vi.mock('$app/paths', () => ({
	// Fills in the route's params, as `[id=objectid]` → the `id` param
	resolve: (route: string, params: Record<string, string> = {}) =>
		route.replace(/\[(\w+)(=\w+)?\]/g, (_, name: string) => params[name])
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), invalidate, beforeNavigate: () => {} }));
// As in production by default, so the tests see what's shipped (dev-only features stay hidden).
// A test can switch to dev.
const environment = vi.hoisted(() => ({ dev: false }));
vi.mock('$app/environment', () => environment);
// EventSource doesn't exist in jsdom; `liveUpdates.test.ts` tests the watcher itself
vi.mock('$lib/liveUpdates', () => ({ CHARACTER_DEPENDENCY: 'app:character', watchCharacter }));

/** Full character data for a mortal with the given ID and name. */
const characterData = (id: string, name: string): CharacterData => ({
	guild: { id: '111', name: 'Camarilla of Chicago', icon: null, count: null },
	owner: null,
	spc: false,
	type: 'full',
	character: {
		_id: id,
		name,
		guild: '111',
		user: '222',
		splat: 'mortal',
		profile: { description: null, biography: null, images: [] },
		health: '......',
		willpower: '.....',
		humanity: 7,
		stains: 0,
		traits: []
	} satisfies Character
});

beforeEach(() => {
	environment.dev = false;
	navigate('http://localhost/');
	invalidate.mockReset().mockResolvedValue(undefined);
	watchCharacter.mockReset().mockReturnValue(() => {});
});

/** The page's props, as SvelteKit passes them, for a character. */
const pageProps = (data: CharacterData): PageProps => ({
	data: { session: null, characterData: data },
	params: { guild: data.guild.id, id: (data.character as Character)._id },
	form: null
});

test('shows the loaded character', () => {
	render(Page, pageProps(characterData('a', 'Nadia')));

	expect(screen.getByRole('heading', { name: 'Nadia' })).toBeInTheDocument();
});

test('navigating to another character shows it', async () => {
	const { rerender } = render(Page, pageProps(characterData('a', 'Nadia')));

	// SvelteKit reuses the page component when only the route's params change
	await rerender(pageProps(characterData('b', 'Bastien')));

	expect(await screen.findByRole('heading', { name: 'Bastien' })).toBeInTheDocument();
	expect(screen.queryByRole('heading', { name: 'Nadia' })).not.toBeInTheDocument();
});

/** Public character data for a character with the given ID and name. */
const publicData = (id: string, name: string): CharacterData => ({
	...characterData(id, name),
	type: 'public',
	character: {
		id,
		user: '222',
		name,
		splat: 'mortal',
		profile: { description: null, biography: null, images: [] }
	}
});

/** The page's props for public character data. */
const publicProps = (data: CharacterData): PageProps => ({
	data: { session: null, characterData: data },
	params: { guild: data.guild.id, id: (data.character as PublicCharacter).id },
	form: null
});

test.each([
	['full', pageProps(characterData('a', 'Nadia'))],
	['public', publicProps(publicData('a', 'Nadia'))]
])('watches a character with %s access, and refetches it on each change', (_, props) => {
	render(Page, props);

	expect(watchCharacter).toHaveBeenCalledOnce();
	const [url, onChange] = watchCharacter.mock.calls[0];
	expect(url).toBe('/api/characters/a/events');

	onChange();
	expect(invalidate).toHaveBeenCalledWith('app:character');
});

test('leaving the page stops watching', () => {
	const stop = vi.fn();
	watchCharacter.mockReturnValue(stop);
	const { unmount } = render(Page, pageProps(characterData('a', 'Nadia')));

	unmount();

	expect(stop).toHaveBeenCalledOnce();
});

test('fresh data for the same character keeps the watch, even when access changes', async () => {
	const { rerender } = render(Page, pageProps(characterData('a', 'Nadia')));

	await rerender(pageProps(characterData('a', 'Nadea')));
	await rerender(publicProps(publicData('a', 'Nadea')));

	expect(watchCharacter).toHaveBeenCalledOnce();
});

test('navigating to another character watches it instead', async () => {
	const stop = vi.fn();
	watchCharacter.mockReturnValue(stop);
	const { rerender } = render(Page, pageProps(characterData('a', 'Nadia')));

	await rerender(pageProps(characterData('b', 'Bastien')));

	expect(stop).toHaveBeenCalledOnce();
	expect(watchCharacter).toHaveBeenLastCalledWith('/api/characters/b/events', expect.any(Function));
});

test('full access (the owner or a Storyteller) can edit', () => {
	render(Page, pageProps(characterData('a', 'Nadia')));

	expect(screen.getAllByRole('button', { name: 'Edit' }).length).toBeGreaterThan(0);
});

test("the tracker actions aren't offered outside dev", () => {
	render(Page, pageProps(characterData('a', 'Nadia')));

	expect(screen.queryByRole('button', { name: 'Health actions' })).not.toBeInTheDocument();
});

test("public access can't edit", () => {
	const data: CharacterData = {
		...characterData('a', 'Nadia'),
		type: 'public',
		character: {
			id: 'a',
			user: '222',
			name: 'Nadia',
			splat: 'mortal',
			profile: { description: null, biography: null, images: [] }
		} satisfies PublicCharacter
	};
	render(Page, pageProps(data));

	expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
});

/** Full character data, owned by the given user (or an SPC), as the signed-in user '222' sees it. */
const ownedBy = (ownerId: string | null): CharacterData => ({
	...characterData('a', 'Nadia'),
	spc: ownerId === null,
	owner: ownerId === null ? null : { id: ownerId, name: 'Someone', icon: '' }
});

test.each([
	["the viewer's own character", '222', true],
	["another player's character (a Storyteller's view)", '333', false],
	['an SPC', null, true]
])(
	'in dev, the tracker actions are offered on %s, and mending too: %s',
	async (_, ownerId, mending) => {
		const user = userEvent.setup();
		environment.dev = true;
		const props = pageProps(ownedBy(ownerId));
		props.data.session = { user: { id: '222' }, expires: '' } as typeof props.data.session;
		render(Page, props);

		// Anyone with full access may deal damage; only the owner (or a Storyteller for an SPC) heals
		await user.click(screen.getByRole('button', { name: 'Health actions' }));

		const menu = await screen.findByRole('dialog');
		expect(within(menu).getByRole('button', { name: 'Take Damage' })).toBeInTheDocument();
		expect(within(menu).queryByRole('group', { name: 'Mend' }) !== null).toBe(mending);
	}
);
