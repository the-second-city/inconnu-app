/**
 * Helpers shared by the character page's tests (CharacterPage.svelte.test.ts and
 * CharacterPage.macros.svelte.test.ts). Each test file mocks SvelteKit and the API itself, since
 * vi.mock only works in the test file.
 */

import { expect, vi } from 'vitest';
import { render, screen, waitFor, type RenderResult } from '@testing-library/svelte';

import type { Character, Guild } from '$lib/types';
import { TEST_CONSTRAINTS } from '$lib/testing/constraints';
import CharacterPage from './CharacterPage.svelte';

/**
 * Whether the viewer prefers reduced motion (jsdom has no matchMedia). Reduced by default, so the
 * macro panel switches to and from its strip at once; a test of the fade turns it off.
 */
export const reduceMotion = (reduce: boolean): void => {
	window.matchMedia = ((query: string) =>
		({
			matches: reduce && query.includes('reduce'),
			media: query
		}) as MediaQueryList) as typeof window.matchMedia;
};

export const GUILD: Guild = { id: '111', name: 'Camarilla of Chicago', icon: null, count: null };

/** A mortal with a description and one trait. */
export const character = (): Character => ({
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
export const renderPage = (char: Character = character()): RenderResult<typeof CharacterPage> =>
	render(CharacterPage, {
		constraints: TEST_CONSTRAINTS,
		guild: GUILD,
		character: char,
		editable: true
	});

/** Render the character page for its owner, who may also edit its macros. */
export const renderOwnerPage = (
	char: Character = character()
): RenderResult<typeof CharacterPage> =>
	render(CharacterPage, {
		constraints: TEST_CONSTRAINTS,
		guild: GUILD,
		character: char,
		editable: true,
		ownerActions: true
	});

/** The panel for the selected tab. */
export const panel = (): HTMLElement => screen.getByRole('tabpanel');

/** An edit button (Edit, Save, Cancel). There's a set for desktop and one for mobile, each hidden
 * by CSS at the other's widths; jsdom has no CSS, so this takes the first, the desktop one. */
export const editButton = (name: 'Edit' | 'Save' | 'Cancel'): HTMLElement =>
	screen.getAllByRole('button', { name })[0];

/** Wait for a save to finish, which leaves edit mode. */
export const saved = async (): Promise<void> => {
	await waitFor(() =>
		expect(screen.queryByRole('textbox', { name: 'Character name' })).not.toBeInTheDocument()
	);
};

/** A beforeNavigate callback, as the page registers it (the test file's `$app/navigation` mock
 * captures it). */
export type BeforeNavigate = ((nav: unknown) => void) | null;

/**
 * Navigate away as SvelteKit would, through the page's beforeNavigate (`before`). Returns whether
 * the navigation was cancelled.
 */
export const leaveVia = (
	before: BeforeNavigate,
	type: string,
	toPath: string | null = '/characters'
): boolean => {
	const cancel = vi.fn();
	before?.({
		type,
		from: { url: new URL('http://localhost/characters/guild/111/id') },
		to: toPath === null ? null : { url: new URL(`http://localhost${toPath}`) },
		cancel
	});
	return cancel.mock.calls.length > 0;
};
