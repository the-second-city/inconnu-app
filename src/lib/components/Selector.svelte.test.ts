import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import Selector from './Selector.svelte';

const OPTIONS = ['Vampire', 'Mortal', 'Ghoul'];

test('labels the select', () => {
	render(Selector, { label: 'Template', options: OPTIONS, value: '', id: 'template' });

	expect(screen.getByRole('combobox', { name: 'Template' })).toBeInTheDocument();
});

test('shows options as given, with lowercased values', () => {
	render(Selector, { label: 'Template', options: OPTIONS, value: '', id: 'template' });

	const options = screen.getAllByRole('option');
	expect(options.map((option) => option.textContent?.trim())).toEqual(OPTIONS);
	expect(options.map((option) => option.getAttribute('value'))).toEqual([
		'vampire',
		'mortal',
		'ghoul'
	]);
});

test('starts on a placeholder that cannot be chosen', () => {
	render(Selector, {
		label: 'Template',
		options: OPTIONS,
		value: '',
		id: 'template',
		placeholder: 'Choose a template'
	});

	const placeholder = screen.getByRole('option', { name: 'Choose a template' });
	expect(placeholder).toBeDisabled();
	expect(screen.getByRole('combobox')).toHaveDisplayValue('Choose a template');
});

test.each([
	[true, 'true'],
	[false, 'false']
])('marks the select required: %s', (required, expected) => {
	render(Selector, { label: 'Template', options: OPTIONS, value: '', id: 'template', required });

	expect(screen.getByRole('combobox')).toHaveAttribute('aria-required', expected);
});

test('choosing an option updates the bound value', async () => {
	const user = userEvent.setup();
	const selected = $state({ value: 'vampire' });
	render(Selector, {
		label: 'Template',
		options: OPTIONS,
		id: 'template',
		get value() {
			return selected.value;
		},
		set value(next: string) {
			selected.value = next;
		}
	});
	expect(screen.getByRole('combobox')).toHaveDisplayValue('Vampire');

	await user.selectOptions(screen.getByRole('combobox'), 'Ghoul');

	expect(selected.value).toBe('ghoul');
});
