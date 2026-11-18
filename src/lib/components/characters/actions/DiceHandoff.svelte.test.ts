import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { expect, test } from 'vitest';

import DiceHandoff from './DiceHandoff.svelte';

/** Render the handoff with stand-in dice, before or after it shows the Hunger. */
const renderHandoff = (show: boolean): HTMLElement => {
	const { container } = render(DiceHandoff, {
		show,
		before: 2,
		after: 3,
		children: createRawSnippet(() => ({
			render: () => '<span role="img" aria-label="Dice"></span>'
		}))
	});
	return container;
};

test('shows the dice, with the Hunger they left hidden but in place', () => {
	const container = renderHandoff(false);

	expect(screen.getByRole('img', { name: 'Dice' })).toBeInTheDocument();
	expect(container.querySelectorAll('[data-gained]')).toHaveLength(1);
	// The Hunger layer is invisible and hidden from screen readers
	const hunger = container.querySelector('[data-gained]')?.closest('[aria-hidden="true"]');
	expect(hunger?.parentElement).toHaveClass('opacity-0');
});

test('handed off, the Hunger shows and the dice fade', () => {
	const container = renderHandoff(true);

	const hunger = container.querySelector('[data-gained]')?.closest('[aria-hidden="true"]');
	expect(hunger?.parentElement).toHaveClass('opacity-100');
	expect(screen.getByRole('img', { name: 'Dice' }).parentElement).toHaveClass('opacity-0');
});
