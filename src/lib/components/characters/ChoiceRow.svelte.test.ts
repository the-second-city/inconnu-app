import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Droplets } from '@lucide/svelte';
import { createRawSnippet } from 'svelte';
import { expect, test, vi } from 'vitest';

import ChoiceRow from './ChoiceRow.svelte';

test('with onclick, it is a button described by its detail', async () => {
	const user = userEvent.setup();
	const onclick = vi.fn();
	render(ChoiceRow, {
		icon: Droplets,
		label: '2 Checks',
		name: 'Rouse 2 Checks',
		detail: '56% chance Hunger rises',
		badge: 'primary',
		onclick
	});

	const row = screen.getByRole('button', { name: 'Rouse 2 Checks' });
	expect(row).toHaveAccessibleDescription('56% chance Hunger rises');
	expect(row).toHaveTextContent('2 Checks');
	await user.click(row);
	expect(onclick).toHaveBeenCalledOnce();
});

test('the label names it, when there is no name', () => {
	render(ChoiceRow, {
		icon: Droplets,
		label: 'Take Damage',
		detail: 'Superficial or Aggravated',
		badge: 'error',
		onclick: () => {}
	});

	expect(screen.getByRole('button', { name: 'Take Damage' })).toBeInTheDocument();
});

test('a disabled row does nothing', async () => {
	const user = userEvent.setup();
	const onclick = vi.fn();
	render(ChoiceRow, {
		icon: Droplets,
		label: 'Mend',
		detail: 'No damage to mend',
		badge: 'success',
		disabled: true,
		onclick
	});

	await user.click(screen.getByRole('button', { name: 'Mend' }));
	expect(onclick).not.toHaveBeenCalled();
});

test('reports the pointer entering it, for previews', async () => {
	const onpointerenter = vi.fn();
	render(ChoiceRow, {
		icon: Droplets,
		label: 'Slake 1',
		detail: 'Harmless',
		badge: 'secondary',
		onclick: () => {},
		onpointerenter
	});

	await fireEvent.pointerEnter(screen.getByRole('button', { name: 'Slake 1' }));
	expect(onpointerenter).toHaveBeenCalledOnce();
});

test('without onclick, it is a described group, with what trails it', () => {
	render(ChoiceRow, {
		icon: Droplets,
		label: '1 Rouse Check',
		name: 'Cost: 1 Rouse Check',
		detail: '50% chance Hunger rises',
		badge: 'primary',
		trailing: createRawSnippet(() => ({ render: () => '<span>meter</span>' }))
	});

	expect(screen.queryByRole('button')).not.toBeInTheDocument();
	const card = screen.getByRole('group', { name: 'Cost: 1 Rouse Check' });
	expect(card).toHaveAccessibleDescription('50% chance Hunger rises');
	expect(card).toHaveTextContent('meter');
});
