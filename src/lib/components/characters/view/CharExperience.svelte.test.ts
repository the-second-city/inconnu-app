import { render, screen, within } from '@testing-library/svelte';
import { expect, test } from 'vitest';

import type { Experience, ExperienceEntry } from '$lib/types';
import CharExperience from './CharExperience.svelte';

/** An experience entry, an unspent award unless overridden. */
const entry = (overrides: Partial<ExperienceEntry> = {}): ExperienceEntry => ({
	event: 'award_unspent',
	amount: 3,
	reason: 'Session 1',
	date: '2024-03-05T12:00:00',
	...overrides
});

/** Render the experience tab with these totals and log. */
const renderExperience = (experience: Partial<Experience> = {}) =>
	render(CharExperience, { experience: { current: 0, total: 0, log: [], ...experience } });

/** The text of an element, with whitespace collapsed. */
const text = (element: HTMLElement): string =>
	element.textContent?.replace(/\s+/g, ' ').trim() ?? '';

/** The log's years, in order, each with its entries' text. */
const entriesByYear = (): [string, string[]][] => {
	const log = screen.getByRole('region', { name: 'Log' });
	return within(log)
		.getAllByRole('heading', { level: 3 })
		.map((heading) => [
			text(heading),
			within(within(log).getByRole('region', { name: text(heading) }))
				.getAllByRole('listitem')
				.map(text)
		]);
};

/** The value shown for a total, by its label. Each term has one definition. */
const total = (label: string): string | undefined => {
	const terms = screen.getAllByRole('term');
	const index = terms.findIndex((term) => term.textContent?.trim() === label);
	expect(index, label).toBeGreaterThanOrEqual(0);
	return screen.getAllByRole('definition')[index].textContent?.trim();
};

/** An ISO date formatted as the component formats it, in this machine's time zone. */
const localDate = (iso: string): string =>
	new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));

test('shows unspent, spent, and lifetime XP, and a bar of the XP spent', () => {
	renderExperience({ current: 4, total: 1200 });

	expect(total('Unspent XP')).toBe('4');
	expect(total('Spent XP')).toBe('1,196');
	expect(total('Lifetime XP')).toBe('1,200');
	expect(screen.getByRole('img', { name: '1,196 of 1,200 XP spent' })).toBeInTheDocument();
});

test('has no spending bar without lifetime XP', () => {
	renderExperience();

	expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

test('lists entries newest first, by year, with their reason, scope, date, and amount', () => {
	renderExperience({
		log: [
			entry({ amount: 5, event: 'award_lifetime', reason: 'Chapter end' }),
			entry({ amount: 1, reason: 'Session 2', date: '2024-06-20T12:00:00' }),
			entry({
				amount: -2,
				event: 'deduct_unspent',
				reason: 'Bought Brawl',
				date: '2025-04-01T12:00:00'
			})
		]
	});

	expect(entriesByYear()).toEqual([
		['2025', [`Bought Brawl Unspent XP · ${localDate('2025-04-01T12:00:00Z')} -2`]],
		[
			'2024',
			[
				`Session 2 Unspent XP · ${localDate('2024-06-20T12:00:00Z')} +1`,
				`Chapter end Lifetime XP · ${localDate('2024-03-05T12:00:00Z')} +5`
			]
		]
	]);
});

test('an entry with an invalid date is grouped under Unknown', () => {
	renderExperience({ log: [entry({ date: 'garbage' })] });

	expect(entriesByYear()).toEqual([['Unknown', ['Session 1 Unspent XP · unknown date +3']]]);
});

test('an entry without a reason says so', () => {
	renderExperience({ log: [entry({ reason: '  ' })] });

	expect(entriesByYear()[0][1][0]).toContain('No reason given');
});

test('an empty log says so', () => {
	renderExperience();

	expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
	expect(
		screen.getByText('No experience awards or deductions have been logged.')
	).toBeInTheDocument();
});
