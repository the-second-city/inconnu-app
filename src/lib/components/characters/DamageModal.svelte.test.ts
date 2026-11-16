import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import type { Character, TrackType } from '$lib/types';
import DamageModal from './DamageModal.svelte';

/** A character with a 5-box Health track (2 healthy, 3 Superficial) and 3-box Willpower. */
const character = (): Character => ({
	_id: 'abc',
	name: 'Nadia',
	guild: '111',
	user: '222',
	splat: 'vampire',
	profile: { description: null, biography: null, images: [] },
	health: '..///',
	willpower: '...',
	humanity: 7,
	stains: 0,
	traits: []
});

/** Render the modal open for a track, and return it. */
const renderModal = async (track: TrackType = 'health'): Promise<HTMLElement> => {
	render(DamageModal, { character: character(), track, open: true });
	return screen.findByRole('dialog');
};

/** The preview's boxes, damage first, by their labels' first letters (A, S, H). */
const preview = (dialog: HTMLElement): string =>
	within(dialog)
		.getAllByRole('img')
		.map((box) => box.getAttribute('aria-label')?.[0])
		.join('');

test('the title names the track, and the preview starts as the track is', async () => {
	const dialog = await renderModal();

	expect(dialog).toHaveAccessibleName('Take Health Damage');
	expect(preview(dialog)).toBe('SSSHH');
	expect(dialog.querySelectorAll('[data-changed]')).toHaveLength(0);
});

test('queued damage shows in the preview, as the bot would apply it', async () => {
	const user = userEvent.setup();
	const dialog = await renderModal();

	await user.click(within(dialog).getByRole('button', { name: 'More Aggravated' }));
	await user.click(within(dialog).getByRole('button', { name: 'More Superficial' }));
	await user.click(within(dialog).getByRole('button', { name: 'More Superficial' }));
	await user.click(within(dialog).getByRole('button', { name: 'More Superficial' }));

	// ..///: 3 Superficial fill the 2 healthy boxes and wrap once, then 1 Aggravated replaces a
	// Superficial box
	expect(preview(dialog)).toBe('AASSS');
	expect(within(dialog).getByRole('group', { name: 'Superficial' })).toHaveTextContent('3');
	expect(within(dialog).getByRole('group', { name: 'Aggravated' })).toHaveTextContent('1');
});

test('the new damage pulses', async () => {
	const user = userEvent.setup();
	const dialog = await renderModal('willpower');

	await user.click(within(dialog).getByRole('button', { name: 'More Superficial' }));
	await user.click(within(dialog).getByRole('button', { name: 'More Aggravated' }));

	expect(dialog.querySelectorAll('[data-changed]')).toHaveLength(2);
});

test('Superficial keeps going past the length of the track, until it is all Aggravated', async () => {
	const user = userEvent.setup();
	const dialog = await renderModal('willpower'); // 3 healthy boxes
	const more = within(dialog).getByRole('button', { name: 'More Superficial' });

	expect(within(dialog).getByRole('button', { name: 'Less Superficial' })).toBeDisabled();
	// 3 fill it, and 3 more wrap each box into Aggravated
	for (let i = 0; i < 5; i++) await user.click(more);
	expect(more).toBeEnabled();
	await user.click(more);

	expect(preview(dialog)).toBe('AAA');
	expect(more).toBeDisabled();
	expect(within(dialog).getByRole('button', { name: 'More Aggravated' })).toBeDisabled();
});

test('on a wrapped track, one more Aggravated adds one Aggravated box', async () => {
	const user = userEvent.setup();
	const dialog = await renderModal(); // ..///
	const moreSuperficial = within(dialog).getByRole('button', { name: 'More Superficial' });
	for (let i = 0; i < 3; i++) await user.click(moreSuperficial);
	expect(preview(dialog)).toBe('ASSSS');

	await user.click(within(dialog).getByRole('button', { name: 'More Aggravated' }));

	expect(preview(dialog)).toBe('AASSS');
});

test("Apply isn't available yet", async () => {
	const dialog = await renderModal();

	expect(within(dialog).getByRole('button', { name: 'Apply' })).toBeDisabled();
});
