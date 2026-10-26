import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import { STRATEGIES } from '$lib/probability';

import Page from './+page.svelte';

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
