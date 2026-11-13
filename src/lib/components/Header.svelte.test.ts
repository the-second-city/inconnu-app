import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import { DISCORD_URL } from '$lib';
import Header from './Header.svelte';

vi.mock('$app/state', () => ({ page: { data: { session: null }, url: new URL('http://x/') } }));
vi.mock('$app/navigation', () => ({ afterNavigate: () => {} }));
vi.mock('$app/paths', () => ({
	resolve: (route: string, params?: { path: string }) =>
		route === '/docs/[...path]' ? `/docs/${params?.path ?? ''}` : route
}));
vi.mock('@auth/sveltekit/client', () => ({ signOut: vi.fn() }));

/** The desktop navigation bar. */
const desktopNav = (): HTMLElement => screen.getAllByRole('navigation')[0];

test('the More menu is closed at first', () => {
	render(Header);

	expect(screen.queryByRole('link', { name: /GitHub/ })).not.toBeInTheDocument();
});

test('the More menu links to Discord, GitHub, and Patreon', async () => {
	const user = userEvent.setup();
	render(Header);

	await user.click(within(desktopNav()).getByRole('button', { name: 'More' }));

	expect(await screen.findByRole('link', { name: /The Second City/ })).toHaveAttribute(
		'href',
		DISCORD_URL
	);
	expect(screen.getByRole('link', { name: /GitHub/ })).toHaveAttribute(
		'href',
		'https://github.com/tiltowait/inconnu'
	);
	expect(screen.getByRole('link', { name: /Patreon/ })).toHaveAttribute(
		'href',
		'https://patreon.com/tiltowait'
	);
});

test('Escape closes the More menu', async () => {
	const user = userEvent.setup();
	render(Header);
	const trigger = within(desktopNav()).getByRole('button', { name: 'More' });
	await user.click(trigger);
	// The menu moves focus into itself shortly after opening; Escape works from there
	await waitFor(() => expect(trigger).not.toHaveFocus());

	await user.keyboard('{Escape}');

	await waitFor(() =>
		expect(screen.queryByRole('link', { name: /GitHub/ })).not.toBeInTheDocument()
	);
});
