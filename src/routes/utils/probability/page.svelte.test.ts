import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test } from 'vitest';

import { calculate, STRATEGIES } from '$lib/probability';

import Page from './+page.svelte';

const STORAGE_KEY = 'probability-inputs';

beforeEach(() => localStorage.clear());

/** The labels of the outcomes shown in the breakdown. */
function shownOutcomes(): string[] {
	return screen.getAllByRole('definition').map((dd) => dd.textContent?.trim() ?? '');
}

test('shows the default roll', () => {
	render(Page);

	expect(screen.getByRole('spinbutton', { name: 'Pool' })).toHaveValue(5);
	expect(screen.getAllByText('average successes')).toHaveLength(Object.keys(STRATEGIES).length + 1);
});

test('shows a result for each Willpower strategy, plus no re-roll', () => {
	render(Page);

	const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent?.trim());
	expect(headings).toEqual(['No Re-roll', ...Object.values(STRATEGIES)]);
});

test('successful includes messy criticals', () => {
	render(Page);

	const { critical, success, messy } = calculate(5, 1, 3);
	const successful = screen.getAllByText('successful')[0].previousElementSibling;
	expect(successful).toHaveTextContent(`${((critical + success + messy) * 100).toFixed(2)}%`);
});

test('hides outcomes that cannot happen', async () => {
	render(Page);
	await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Hunger' }), '0');

	const outcomes = shownOutcomes();
	expect(outcomes).toContain('Critical Win');
	expect(outcomes).not.toContain('Messy Critical');
	expect(outcomes).not.toContain('Bestial Failure');
});

test.each([
	['Pool', '0', 'Pool must be a whole number from 1 to 100.'],
	['Pool', '101', 'Pool must be a whole number from 1 to 100.'],
	['Difficulty', '-1', 'Difficulty must be a whole number of 0 or more.']
])('rejects %s of %s', async (name: string, value: string, message: string) => {
	render(Page);
	const input = screen.getByRole('spinbutton', { name });
	await userEvent.clear(input);
	await userEvent.type(input, value);

	expect(screen.getByRole('alert')).toHaveTextContent(message);
	expect(screen.queryByText('average successes')).not.toBeInTheDocument();
});

test('restores the last inputs', () => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify({ pool: 8, hunger: 3, difficulty: 4 }));
	render(Page);

	expect(screen.getByRole('spinbutton', { name: 'Pool' })).toHaveValue(8);
	expect(screen.getByRole('combobox', { name: 'Hunger' })).toHaveValue('3');
	expect(screen.getByRole('spinbutton', { name: 'Difficulty' })).toHaveValue(4);
});

test('ignores invalid saved inputs', () => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify({ pool: 500, hunger: 'x', difficulty: 2 }));
	render(Page);

	expect(screen.getByRole('spinbutton', { name: 'Pool' })).toHaveValue(5);
	expect(screen.getByRole('combobox', { name: 'Hunger' })).toHaveValue('1');
	expect(screen.getByRole('spinbutton', { name: 'Difficulty' })).toHaveValue(2);
});

test('ignores unreadable saved inputs', () => {
	localStorage.setItem(STORAGE_KEY, '{not json');
	render(Page);

	expect(screen.getByRole('spinbutton', { name: 'Pool' })).toHaveValue(5);
});

test('saves inputs as they change', async () => {
	render(Page);
	const pool = screen.getByRole('spinbutton', { name: 'Pool' });
	await userEvent.clear(pool);
	await userEvent.type(pool, '12');
	await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Hunger' }), '4');

	expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
		pool: 12,
		hunger: 4,
		difficulty: 3
	});
});

test('hovering an outcome labels its bar segment', async () => {
	render(Page);
	const row = screen.getAllByText('Critical Win')[0].parentElement;
	expect(screen.queryByText(/^Critical Win ·/)).not.toBeInTheDocument();

	await userEvent.hover(row as HTMLElement);
	expect(screen.getByText(/^Critical Win ·/)).toBeInTheDocument();

	await userEvent.unhover(row as HTMLElement);
	expect(screen.queryByText(/^Critical Win ·/)).not.toBeInTheDocument();
});

test('explains each re-roll strategy', async () => {
	render(Page);
	expect(screen.queryByRole('button', { name: 'About No Re-roll' })).not.toBeInTheDocument();

	await userEvent.click(screen.getByRole('button', { name: 'About Re-roll Failures' }));
	expect(await screen.findByText('Re-roll up to three failing normal dice.')).toBeInTheDocument();
});
