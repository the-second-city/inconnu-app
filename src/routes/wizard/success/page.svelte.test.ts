import { render, screen } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

import { creationInfoStore, type CreationInfo } from '$lib/stores/CreationStore';
import Page from './+page.svelte';

vi.mock('$app/state', () => import('$lib/testing/page.svelte'));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/paths', () => ({
	resolve: (route: string, params: Record<string, string> = {}) =>
		route.replace(/\[(\w+)(=\w+)?\]/g, (_, name: string) => params[name])
}));

/** What the bot answered for a created character, from a supporter or not. */
const created = (supporter: boolean): CreationInfo => ({
	character_id: 'abc123',
	guild: { id: '111', name: 'Camarilla of Chicago', icon: null, count: null },
	character_name: 'Nadia',
	has_premium: supporter
});

beforeEach(() => {
	creationInfoStore.set(null);
});

test('thanks a supporter', () => {
	creationInfoStore.set(created(true));
	render(Page);

	expect(screen.getByRole('heading', { name: 'Thank you, Patron!' })).toBeInTheDocument();
	expect(screen.queryByRole('heading', { name: 'Support Inconnu' })).not.toBeInTheDocument();
});

test('invites everyone else to support Inconnu', () => {
	creationInfoStore.set(created(false));
	render(Page);

	expect(screen.getByRole('heading', { name: 'Support Inconnu' })).toBeInTheDocument();
	expect(screen.queryByRole('heading', { name: 'Thank you, Patron!' })).not.toBeInTheDocument();
});
