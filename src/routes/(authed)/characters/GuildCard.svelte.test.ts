import { render, screen } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';

import type { Guild } from '$lib/types';
import GuildCard from './GuildCard.svelte';

vi.mock('$app/paths', () => ({
	resolve: (_route: string, params: { guild: string }) => `/characters/guild/${params.guild}`
}));

/** A guild with `count` characters. */
const guild = (count: number | null): Guild => ({
	id: '123456789012345678',
	name: 'Camarilla of Chicago',
	icon: null,
	count
});

test("links to the guild's characters", () => {
	render(GuildCard, { guild: guild(3) });

	const link = screen.getByRole('link', { name: /Camarilla of Chicago/ });
	expect(link).toHaveAttribute('href', '/characters/guild/123456789012345678');
	expect(link).toHaveAttribute('title', 'View Camarilla of Chicago characters');
});

test('shows the character count', () => {
	render(GuildCard, { guild: guild(3) });

	expect(screen.getByText('3')).toBeInTheDocument();
});

test('shows a count of zero', () => {
	render(GuildCard, { guild: guild(0) });

	expect(screen.getByText('0')).toBeInTheDocument();
});

test('leaves out an unknown count', () => {
	render(GuildCard, { guild: guild(null) });

	expect(screen.getByRole('link')).not.toHaveTextContent(/\d/);
});
