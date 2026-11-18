import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';

import HungerMeter from './HungerMeter.svelte';

/** How many of the meter's drops are filled (the empty ones have no fill), faint or not. */
const filled = (meter: Element): number =>
	[...meter.querySelectorAll('path')].filter((path) => path.getAttribute('fill') !== 'none').length;

test('shows the Hunger out of five', () => {
	render(HungerMeter, { hunger: 3, label: 'Current Hunger 3' });

	const meter = screen.getByRole('img', { name: 'Current Hunger 3' });
	expect(meter.querySelectorAll('svg')).toHaveLength(5);
	expect(filled(meter)).toBe(3);
});

test('without a label, screen readers skip it', () => {
	const { container } = render(HungerMeter, { hunger: 2 });

	expect(screen.queryByRole('img', { name: /Hunger/ })).not.toBeInTheDocument();
	expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
});

test.each([
	// [hunger, to, filled drops]
	[2, 4, 4], // A rise shows faintly
	[4, 1, 1] // A drop shows hollow
])('a preview from %i to %i fills %i drops, unmarked', (hunger, to, count) => {
	const { container } = render(HungerMeter, { hunger, to });

	expect(filled(container)).toBe(count);
	expect(container.querySelectorAll('[data-gained], [data-lost]')).toHaveLength(0);
});

test('a result marks what it added', () => {
	const { container } = render(HungerMeter, { hunger: 2, to: 4, mark: 'pulse' });

	expect(filled(container)).toBe(4);
	expect(container.querySelectorAll('[data-gained]')).toHaveLength(2);
	expect(container.querySelectorAll('[data-lost]')).toHaveLength(0);
});

test('a result marks what it removed', () => {
	const { container } = render(HungerMeter, { hunger: 4, to: 1, mark: 'pulse' });

	expect(filled(container)).toBe(1);
	expect(container.querySelectorAll('[data-lost]')).toHaveLength(3);
	expect(container.querySelectorAll('[data-gained]')).toHaveLength(0);
});
