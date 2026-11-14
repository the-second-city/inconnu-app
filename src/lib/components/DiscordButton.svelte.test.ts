import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import DiscordButton from './DiscordButton.svelte';

type Session = { user: { id: string; name?: string; image?: string } } | null;

const page = vi.hoisted(() => ({ data: { session: null as Session } }));
const signOut = vi.hoisted(() => vi.fn());

vi.mock('$app/state', () => ({ page }));
vi.mock('@auth/sveltekit/client', () => ({ signOut }));

const AVATAR = 'https://cdn.discordapp.com/avatars/222/abc.png';

/** Sign in as Nadia, with a Discord avatar unless `image` is overridden. */
const signIn = (image: string | undefined = AVATAR) => {
	page.data.session = { user: { id: '222', name: 'Nadia', image } };
};

beforeEach(() => {
	page.data.session = null;
	signOut.mockReset();
});

test('offers to sign in when signed out', () => {
	render(DiscordButton);

	expect(screen.getByRole('button', { name: 'Sign in to Discord' })).toBeInTheDocument();
});

test("shows the user's name and avatar when signed in", () => {
	signIn();
	render(DiscordButton);

	const trigger = screen.getByRole('button', { name: /Nadia/ });
	expect(trigger).toHaveTextContent('Nadia');
	expect(screen.getByAltText('Nadia')).toHaveAttribute('src', AVATAR);
	expect(screen.queryByRole('button', { name: 'Sign in to Discord' })).not.toBeInTheDocument();
});

test('the compact button shows only the avatar', () => {
	signIn();
	render(DiscordButton, { full: false });

	expect(screen.getByAltText('Nadia')).toHaveAttribute('src', AVATAR);
	expect(screen.getByRole('button')).not.toHaveTextContent('Nadia');
});

test("falls back to the user's initial without an avatar", () => {
	signIn('');
	render(DiscordButton, { full: false });

	expect(screen.queryByAltText('Nadia')).not.toBeInTheDocument();
	expect(screen.getByRole('button')).toHaveTextContent('N');
});

test('the menu signs out, back to the home page', async () => {
	const user = userEvent.setup();
	signIn();
	render(DiscordButton);

	expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: /Nadia/ }));
	await user.click(await screen.findByRole('button', { name: 'Sign out' }));

	expect(signOut).toHaveBeenCalledWith({ redirect: true, redirectTo: '/' });
});
