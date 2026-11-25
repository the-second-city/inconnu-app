import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import PoolChips from './PoolChips.svelte';
import { PoolPicker } from '$lib/state/poolPicker.svelte';
import type { Trait } from '$lib/types';

/** A trait of the type, rated 2. */
const trait = (name: string, type: string): Trait => ({ name, rating: 2, type, subtraits: [] });

const TRAITS = [
	trait('Manipulation', 'attribute'),
	trait('Occult', 'skill'),
	trait('Obvious Predator', 'custom')
];

/** Render chips for a picker with Occult (Bahari), Obvious Predator, and Manipulation picked. */
const renderChips = (): PoolPicker => {
	const picker = new PoolPicker();
	picker.pick('Occult', 'Bahari');
	picker.pick('Obvious Predator', null);
	picker.pick('Manipulation', null);
	render(PoolChips, { picker, traits: TRAITS });
	return picker;
};

/** The chips' text, in order. */
const chips = (): string[] =>
	within(screen.getByRole('list', { name: 'Pool' }))
		.getAllByRole('listitem')
		.map((chip) => chip.textContent?.replace(/\s+/g, ' ').trim() ?? '');

test('the chips show the pool in its order, specialties included', () => {
	renderChips();

	expect(chips()).toEqual(['Manipulation', 'Occult (Bahari)', 'Obvious Predator']);
});

test("clicking a chip's sign subtracts the trait, moving it last; again adds it back", async () => {
	const user = userEvent.setup();
	const picker = renderChips();
	const sign = screen.getByRole('button', { name: 'Subtract Occult' });
	expect(sign).toHaveAttribute('aria-pressed', 'false');

	await user.click(sign);

	expect(picker.isNegative('Occult')).toBe(true);
	expect(screen.getByRole('button', { name: 'Subtract Occult' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	expect(chips()).toEqual(['Manipulation', 'Obvious Predator', 'Occult (Bahari)']);

	await user.click(screen.getByRole('button', { name: 'Subtract Occult' }));
	expect(picker.isNegative('Occult')).toBe(false);
});

test("the last trait added can't be subtracted", async () => {
	const user = userEvent.setup();
	renderChips();
	await user.click(screen.getByRole('button', { name: 'Subtract Occult' }));
	await user.click(screen.getByRole('button', { name: 'Subtract Obvious Predator' }));

	expect(screen.getByRole('button', { name: 'Subtract Manipulation' })).toBeDisabled();
	expect(screen.getByRole('button', { name: 'Subtract Occult' })).toBeEnabled();
});

test("a chip's ✕ removes the trait", async () => {
	const user = userEvent.setup();
	const picker = renderChips();

	await user.click(screen.getByRole('button', { name: 'Remove Occult' }));

	expect(picker.selection('Occult')).toBeUndefined();
	expect(chips()).toEqual(['Manipulation', 'Obvious Predator']);
});
