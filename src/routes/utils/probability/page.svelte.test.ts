import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { calculate, STRATEGIES, type Probabilities, type Strategy } from '$lib/probability';

import Page from './+page.svelte';

const STORAGE_KEY = 'probability-inputs';

beforeEach(() => localStorage.clear());

afterEach(() => {
	vi.restoreAllMocks();
});

/** The card showing a roll's results, found by its heading. */
function card(name: string): HTMLElement {
	const heading = screen
		.getAllByRole('heading', { level: 2 })
		.find((h) => h.textContent?.trim() === name);
	if (!heading?.parentElement) throw new Error(`No card for ${name}`);
	return heading.parentElement;
}

/** The chance of any success, including messy criticals. */
function successful(probs: Probabilities): number {
	return probs.critical + probs.success + probs.messy;
}

/** A difference in probability, as the page shows it, in signed percentage points. */
function points(value: number): string {
	const sign = value > 0 ? '+' : '';
	return `${sign}${(value * 100).toFixed(2)} pts`;
}

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

test('compares each strategy to no re-roll', () => {
	render(Page);
	const baseline = calculate(5, 1, 3);

	expect(within(card('No Re-roll')).queryByText(/pts$/)).not.toBeInTheDocument();
	for (const [strategy, name] of Object.entries(STRATEGIES)) {
		const probs = calculate(5, 1, 3, strategy as Strategy);
		const change = points(successful(probs) - successful(baseline));
		expect(within(card(name)).getByText(change)).toBeInTheDocument();
	}
});

test.each([
	['reroll_failures', false],
	['maximize_criticals', false],
	['avoid_messy', true],
	['risky', true]
] as [Strategy, boolean][])(
	'%s shows its change in messy criticals: %s',
	(strategy: Strategy, shown: boolean) => {
		render(Page);
		const row = within(card(STRATEGIES[strategy])).getByText('Messy Critical');

		if (shown) {
			const change = calculate(5, 1, 3, strategy).messy - calculate(5, 1, 3).messy;
			expect(row).toHaveTextContent(`Messy Critical ${points(change)}`);
		} else {
			expect(row).not.toHaveTextContent('pts');
		}
	}
);

test.each(Object.entries(STRATEGIES))(
	'only Maximize Crits warns about its risks (%s)',
	async (strategy: string, name: string) => {
		render(Page);
		await userEvent.click(screen.getByRole('button', { name: `About ${name}` }));
		await screen.findByRole('dialog');

		const warning = screen.queryByText(/functionally identical to Re-roll Failures/);
		if (strategy === 'maximize_criticals') {
			expect(warning).toBeInTheDocument();
		} else {
			expect(warning).not.toBeInTheDocument();
		}
	}
);

test('works without local storage', async () => {
	vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
		throw new Error('Storage is disabled');
	});
	vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
		throw new Error('Storage is disabled');
	});
	render(Page);
	const pool = screen.getByRole('spinbutton', { name: 'Pool' });
	await userEvent.clear(pool);
	await userEvent.type(pool, '8');

	const expected = successful(calculate(8, 1, 3));
	const headline = within(card('No Re-roll')).getByText('successful').previousElementSibling;
	expect(headline).toHaveTextContent(`${(expected * 100).toFixed(2)}%`);
});
