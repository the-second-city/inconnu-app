import { render, screen } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

import type { Guild, OwnerData } from '$lib/types';
import CharHeader from './CharHeader.svelte';

const page = vi.hoisted(() => ({
	data: { session: { user: { id: '222' } } } as { session: { user: { id: string } } | null }
}));

vi.mock('$app/state', () => ({ page }));
vi.mock('$app/paths', () => ({
	resolve: (route: string) => route
}));

const GUILD: Guild = { id: '111', name: 'Camarilla of Chicago', icon: null, count: null };
const OWNER: OwnerData = { id: '333', name: 'Lodin', icon: null };

/** The text of the metadata line under the name, with whitespace collapsed. */
const metadata = (): string =>
	(screen.getByRole('heading', { level: 6 }).textContent ?? '').replace(/\s+/g, ' ').trim();

beforeEach(() => {
	page.data = { session: { user: { id: '222' } } };
});

test('shows the name', () => {
	render(CharHeader, { name: 'Nadia', images: [], guild: null });

	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nadia');
});

test('shows the guild and owner', () => {
	render(CharHeader, { name: 'Nadia', images: [], guild: GUILD, owner: OWNER });

	expect(metadata()).toMatch(/^Camarilla of Chicago .*• Lodin/);
});

test('calls the current user "You"', () => {
	render(CharHeader, {
		name: 'Nadia',
		images: [],
		guild: GUILD,
		owner: { ...OWNER, id: '222' }
	});

	expect(screen.getByText('You')).toBeInTheDocument();
	expect(metadata()).not.toContain('Lodin');
});

test('a signed-out viewer is never "You"', () => {
	page.data = { session: null };
	render(CharHeader, { name: 'Nadia', images: [], guild: GUILD, owner: OWNER });

	expect(screen.queryByText('You')).not.toBeInTheDocument();
	expect(metadata()).toContain('Lodin');
});

test('marks SPCs', () => {
	render(CharHeader, { name: 'Nadia', images: [], guild: GUILD, spc: true });

	expect(screen.getByText('SPC')).toBeInTheDocument();
});

test('has no metadata line without a guild, owner, or SPC flag', () => {
	render(CharHeader, { name: 'Nadia', images: [], guild: null });

	expect(screen.queryByRole('heading', { level: 6 })).not.toBeInTheDocument();
});

test('links back when given somewhere to go', () => {
	render(CharHeader, { name: 'Nadia', images: [], guild: null, backUrl: '/characters' });

	expect(screen.getByRole('link')).toHaveAttribute('href', '/characters');
});

test('has no back link otherwise', () => {
	render(CharHeader, { name: 'Nadia', images: [], guild: null });

	expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
