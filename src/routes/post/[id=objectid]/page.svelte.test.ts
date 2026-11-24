import { render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { page } from '$lib/testing/page.svelte';
import type { Changelog } from '$lib/types';
import Page from './+page.svelte';

vi.mock('$app/state', () => import('$lib/testing/page.svelte'));

/** A rolepost's changelog: two revisions, dated as the API sends them (UTC, without an offset). */
const changelog = (deletionDate: string | null = null): Changelog => ({
	guild: { id: '111', name: 'Camarilla of Chicago', icon: null, count: null },
	poster: null,
	channel: 'elysium',
	character: { id: '613d3e4bba8a6a8dc0ee2a09', name: 'Nadia' },
	url: null,
	history: [
		{ date: '2026-11-22T23:30:00', content: 'Edited.' },
		{ date: '2026-11-22T23:00:00', content: 'Original.' }
	],
	deletion_date: deletionDate
});

beforeEach(() => {
	// A viewer seven hours behind UTC, where 23:30 UTC is 16:30 the same day
	vi.stubEnv('TZ', 'America/Phoenix');
	vi.useFakeTimers({ now: new Date('2026-11-23T00:00:00Z'), toFake: ['Date'] });
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.useRealTimers();
	page.data = { session: null };
});

test('revision dates are UTC, shown in the viewer’s time zone', () => {
	page.data = { session: null, changelog: changelog() };
	render(Page);

	const options = screen.getAllByRole('option').map((option) => option.textContent?.trim());
	expect(options).toEqual(['Nov 22, 2026, 16:30:00', 'Nov 22, 2026, 16:00:00 (Original)']);
});

test('a deletion date not yet reached says when, in the viewer’s time zone', () => {
	page.data = { session: null, changelog: changelog('2026-11-23T05:00:00') };
	render(Page);

	// 05:00 UTC is still ahead of the fake now (00:00 UTC), though 05:00 in Phoenix is not
	expect(
		screen.getByText('This post will be deleted on Nov 22, 2026, 22:00:00.')
	).toBeInTheDocument();
});

test('a deletion date already passed says the post is deleted', () => {
	page.data = { session: null, changelog: changelog('2026-11-22T23:59:00') };
	render(Page);

	expect(screen.getByText('This post has been deleted.')).toBeInTheDocument();
});
