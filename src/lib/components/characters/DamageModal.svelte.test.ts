import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import type { Character, TrackType } from '$lib/types';
import DamageModal from './DamageModal.svelte';

const damage = vi.hoisted(() => vi.fn());
vi.mock('$lib/characterActions', () => ({ damage }));
// No busy delay: the work's own promise decides when it's done
vi.mock('$lib/busy', () => ({ atLeast: <T>(work: Promise<T>): Promise<T> => work }));

beforeEach(() => {
	damage.mockReset().mockResolvedValue({ result: null });
});

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

test('Apply needs some damage queued', async () => {
	const user = userEvent.setup();
	const dialog = await renderModal();
	const apply = within(dialog).getByRole('button', { name: 'Apply' });
	expect(apply).toBeDisabled();

	await user.click(within(dialog).getByRole('button', { name: 'More Aggravated' }));

	expect(apply).toBeEnabled();
});

/** Render the modal with `open` as state, so its closing shows. Returns that state. */
const renderBound = (): { open: boolean } => {
	const bound = $state({ open: true });
	render(DamageModal, {
		character: character(),
		track: 'health',
		get open() {
			return bound.open;
		},
		set open(next: boolean) {
			bound.open = next;
		}
	});
	return bound;
};

test('Apply deals the queued damage, then closes', async () => {
	const user = userEvent.setup();
	const bound = renderBound();
	const dialog = await screen.findByRole('dialog');
	await user.click(within(dialog).getByRole('button', { name: 'More Superficial' }));
	await user.click(within(dialog).getByRole('button', { name: 'More Superficial' }));
	await user.click(within(dialog).getByRole('button', { name: 'More Aggravated' }));

	await user.click(within(dialog).getByRole('button', { name: 'Apply' }));

	expect(damage).toHaveBeenCalledWith('abc', { track: 'health', superficial: 2, aggravated: 1 });
	await waitFor(() => expect(bound.open).toBe(false));
});

test('a failed Apply says why, and stays open', async () => {
	const user = userEvent.setup();
	damage.mockResolvedValueOnce({ error: "Couldn't reach Inconnu to deal damage." });
	const bound = renderBound();
	const dialog = await screen.findByRole('dialog');
	await user.click(within(dialog).getByRole('button', { name: 'More Aggravated' }));

	await user.click(within(dialog).getByRole('button', { name: 'Apply' }));

	expect(await within(dialog).findByRole('alert')).toHaveTextContent(
		"Couldn't reach Inconnu to deal damage."
	);
	expect(bound.open).toBe(true);
});

test('while applying, a spinner takes the place of the content, until the modal closes', async () => {
	const user = userEvent.setup();
	let answer: (outcome: unknown) => void = () => {};
	damage.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
	const bound = renderBound();
	const dialog = await screen.findByRole('dialog');
	await user.click(within(dialog).getByRole('button', { name: 'More Aggravated' }));

	await user.click(within(dialog).getByRole('button', { name: 'Apply' }));

	expect(within(dialog).getByRole('status')).toHaveTextContent('Applying damage…');
	expect(within(dialog).queryByRole('button')).not.toBeInTheDocument();
	answer({ result: null });
	await waitFor(() => expect(bound.open).toBe(false));
});

test('before Apply, the preview follows changes to the character', async () => {
	const { rerender } = render(DamageModal, { character: character(), track: 'health', open: true });
	const dialog = await screen.findByRole('dialog');

	await rerender({ character: { ...character(), health: './//x' } });

	expect(preview(dialog)).toBe('ASSSH');
});
