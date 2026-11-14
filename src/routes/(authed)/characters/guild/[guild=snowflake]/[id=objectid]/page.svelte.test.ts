import { render, screen } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

import type { Character, CharacterData } from '$lib/types';
import { navigate } from '$lib/testing/page.svelte';
import Page from './+page.svelte';
import type { PageProps } from './$types';

vi.mock('$app/state', () => import('$lib/testing/page.svelte'));
vi.mock('$app/paths', () => ({ resolve: (route: string) => route }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

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

beforeEach(() => navigate('http://localhost/'));

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
