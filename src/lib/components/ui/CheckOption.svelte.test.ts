import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import CheckOption from './CheckOption.svelte';

/** Render an option with `checked` in state the test can read, as a parent binds it. */
const renderOption = (props: Record<string, unknown> = {}) => {
	const state = $state({ checked: false });
	render(CheckOption, {
		label: 'Hunt',
		get checked() {
			return state.checked;
		},
		set checked(value: boolean) {
			state.checked = value;
		},
		...props
	});
	return state;
};

test('named by its label, described by its detail, and toggled from its row', async () => {
	const user = userEvent.setup();
	const state = renderOption({ detail: 'On a win, offer to slake Hunger' });
	const box = screen.getByRole('checkbox', { name: 'Hunt' });
	expect(box).toHaveAccessibleDescription('On a win, offer to slake Hunger');

	await user.click(screen.getByText('On a win, offer to slake Hunger'));

	expect(state.checked).toBe(true);
	expect(box).toBeChecked();
});

test("disabled, it doesn't toggle", async () => {
	const user = userEvent.setup();
	const state = renderOption({ disabled: true });

	await user.click(screen.getByText('Hunt'));

	expect(state.checked).toBe(false);
	expect(screen.getByRole('checkbox', { name: 'Hunt' })).toBeDisabled();
});
