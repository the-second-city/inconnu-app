import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import Stepper from './Stepper.svelte';

/** Render a stepper with its value in state the test can read, as a parent binds it. */
const renderStepper = (props: Record<string, unknown> = {}, start = 0) => {
	const state = $state({ value: start });
	render(Stepper, {
		label: 'Modifier',
		min: -2,
		max: 2,
		get value() {
			return state.value;
		},
		set value(value: number) {
			state.value = value;
		},
		...props
	});
	return state;
};

test('steps the value within its range', async () => {
	const user = userEvent.setup();
	const state = renderStepper({}, 1);

	await user.click(screen.getByRole('button', { name: 'More Modifier' }));
	expect(state.value).toBe(2);
	expect(screen.getByRole('button', { name: 'More Modifier' })).toBeDisabled();

	await user.click(screen.getByRole('button', { name: 'Less Modifier' }));
	expect(state.value).toBe(1);
});

test('the detail describes the group', () => {
	renderStepper({ detail: 'Dice beyond the traits' });

	expect(screen.getByRole('group', { name: 'Modifier' })).toHaveAccessibleDescription(
		'Dice beyond the traits'
	);
});

test('compact, the label names the group unseen, and the value shows as formatted', async () => {
	const user = userEvent.setup();
	renderStepper({
		compact: true,
		detail: 'Adds dice',
		format: (value: number) => (value > 0 ? `+${value}` : String(value))
	});
	const group = screen.getByRole('group', { name: 'Modifier' });
	expect(screen.queryByText('Modifier')).not.toBeInTheDocument();
	expect(group).toHaveAccessibleDescription('Adds dice');

	await user.click(screen.getByRole('button', { name: 'More Modifier' }));

	expect(group).toHaveTextContent('+1');
});
