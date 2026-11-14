import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import type { CharacterLog, Splat } from '$lib/types';
import CharLog from './CharLog.svelte';

/** A log with every counter at zero, unless overridden. */
const log = (overrides: Partial<CharacterLog> = {}): CharacterLog => ({
	created: '2024-03-05T12:00:00',
	left: null,
	deepest_degeneration: 0,
	degenerations: 0,
	frenzy_resisted: 0,
	health_aggravated: 0,
	health_superficial: 0,
	hunger_gained: 0,
	hunger_slaked: 0,
	hunts: 0,
	remorse_checks: 0,
	remorse_failures: 0,
	remorse_successes: 0,
	rouse_checks: 0,
	rouse_failures: 0,
	rouse_successes: 0,
	stains_gained: 0,
	surges: 0,
	times_awakened: 0,
	times_blushed: 0,
	times_frenzied: 0,
	times_impaired: 0,
	times_mended: 0,
	times_slaked: 0,
	willpower_aggravated: 0,
	willpower_superficial: 0,
	worst_health: '',
	worst_willpower: '',
	incomplete_since: {},
	...overrides
});

/** The headings of the rendered stat groups. */
const headings = (): string[] =>
	screen.getAllByRole('heading').map((heading) => heading.textContent?.trim() ?? '');

/** The value shown for a stat, by its label, within a group. */
const value = (group: string, label: string): string | null | undefined => {
	const region = screen.getByRole('region', { name: group });
	return within(region).getByText(label).closest('div')?.querySelector('dd')?.textContent;
};

test.each<[Splat, string[]]>([
	['vampire', ['Blood', 'Hunger', 'Nights', 'Frenzy', 'Humanity', 'Damage']],
	['thin-blood', ['Blood', 'Hunger', 'Nights', 'Frenzy', 'Humanity', 'Damage']],
	['mortal', ['Humanity', 'Damage']],
	['ghoul', ['Humanity', 'Damage']]
])('a %s shows the groups %j', (splat, expected) => {
	render(CharLog, { log: log(), splat });

	expect(headings()).toEqual(expected);
});

test('a non-vampire shows vampiric groups that have counts', () => {
	render(CharLog, { log: log({ times_frenzied: 1 }), splat: 'ghoul' });

	expect(headings()).toEqual(['Frenzy', 'Humanity', 'Damage']);
});

test('shows counts under their groups', () => {
	render(CharLog, {
		log: log({ rouse_checks: 12, hunger_slaked: 4, remorse_successes: 2, health_aggravated: 3 }),
		splat: 'vampire'
	});

	expect(value('Blood', 'Rouse checks')).toBe('12');
	expect(value('Hunger', 'Total Hunger slaked')).toBe('4');
	expect(value('Humanity', 'Remorse successes')).toBe('2');
	expect(value('Damage', 'Aggravated Health')).toBe('3');
});

test('separates thousands', () => {
	render(CharLog, { log: log({ rouse_checks: 22349 }), splat: 'vampire' });

	expect(value('Blood', 'Rouse checks')).toBe('22,349');
});

test('reads offset-less dates as UTC', () => {
	render(CharLog, { log: log({ created: '2024-03-05T23:30:00' }), splat: 'mortal' });

	// The database's naive dates are UTC, so this must format like the explicit UTC date
	const expected = new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	}).format(new Date('2024-03-05T23:30:00Z'));
	expect(screen.getByText(/^Created/)).toHaveTextContent(`Created ${expected}`);
});

test('shows when the owner left, only if they did', () => {
	const { unmount } = render(CharLog, { log: log(), splat: 'mortal' });
	expect(screen.queryByText('Owner left the server')).not.toBeInTheDocument();
	unmount();

	render(CharLog, { log: log({ left: '2025-01-02T00:00:00Z' }), splat: 'mortal' });
	expect(screen.getByText('Owner left the server')).toBeInTheDocument();
});

test('only incomplete counters have an info button', () => {
	render(CharLog, {
		log: log({
			incomplete_since: { hunts: '2026-11-14T12:00:00Z', surges: '2026-11-14T12:00:00Z' }
		}),
		splat: 'vampire'
	});

	const infos = screen.getAllByRole('button', { name: /^About / });
	expect(infos.map((button) => button.getAttribute('aria-label'))).toEqual([
		'About Blood Surges',
		'About Hunts'
	]);
});

test('an info button explains when counting began', async () => {
	const user = userEvent.setup();
	render(CharLog, {
		log: log({ incomplete_since: { hunts: '2026-11-14T12:00:00Z' } }),
		splat: 'vampire'
	});

	await user.click(screen.getByRole('button', { name: 'About Hunts' }));

	expect(await screen.findByRole('dialog')).toHaveTextContent(
		"Counted since Nov 14, 2026. Earlier events aren't included."
	);
});

test('has no info buttons when every counter is complete', () => {
	render(CharLog, { log: log(), splat: 'vampire' });

	expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('shows the worst tracks as damage boxes, damage first', () => {
	render(CharLog, { log: log({ worst_health: '....//x', times_mended: 3 }), splat: 'mortal' });

	const damage = screen.getByRole('region', { name: 'Damage' });
	const track = within(damage).getByRole('img', { name: '2 Superficial, 1 Aggravated of 7' });
	const boxes = within(track).getAllByRole('img', { hidden: true });
	expect(boxes).toHaveLength(7);
	expect(boxes[0]).toHaveAttribute('aria-label', expect.stringMatching(/damage/i));
	expect(value('Damage', 'Times mended')).toBe('3');
});

test('a track that was never damaged says so', () => {
	render(CharLog, { log: log(), splat: 'mortal' });

	const damage = screen.getByRole('region', { name: 'Damage' });
	expect(within(damage).getAllByText('None recorded')).toHaveLength(2);
});

test('a worst track gets an info button when it is incomplete', () => {
	render(CharLog, {
		log: log({ incomplete_since: { worst_willpower: '2026-11-14T20:00:00Z' } }),
		splat: 'mortal'
	});

	expect(screen.getByRole('button', { name: 'About Worst Willpower' })).toBeInTheDocument();
});

test('a non-vampire shows vampiric groups only for counts, not empty tracks', () => {
	render(CharLog, { log: log({ worst_health: '' }), splat: 'mortal' });

	expect(headings()).toEqual(['Humanity', 'Damage']);
});
