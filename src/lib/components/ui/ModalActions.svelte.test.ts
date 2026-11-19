import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet, type Snippet } from 'svelte';
import { expect, test, vi } from 'vitest';

import ModalActions from './ModalActions.svelte';

/** The props a test may set; `open` is always state. */
type ActionsProps = Partial<{
	done: boolean;
	locked: boolean;
	action: string;
	onaction: () => void;
	disabled: boolean;
	cancelLabel: string;
	children: Snippet;
}>;

/** Render the buttons for an open modal, with `open` as state so closing shows. Returns that state. */
const renderActions = (props: ActionsProps = {}): { open: boolean } => {
	const bound = $state({ open: true });
	render(ModalActions, {
		...props,
		get open() {
			return bound.open;
		},
		set open(next: boolean) {
			bound.open = next;
		}
	});
	return bound;
};

test('Cancel closes the modal', async () => {
	const user = userEvent.setup();
	const bound = renderActions();

	await user.click(screen.getByRole('button', { name: 'Cancel' }));

	expect(bound.open).toBe(false);
	expect(screen.getAllByRole('button')).toHaveLength(1);
});

test('the action runs without closing', async () => {
	const user = userEvent.setup();
	const onaction = vi.fn();
	const bound = renderActions({ action: 'Roll', onaction });

	await user.click(screen.getByRole('button', { name: 'Roll' }));

	expect(onaction).toHaveBeenCalledOnce();
	expect(bound.open).toBe(true);
});

test('the action can be disabled alone, and is never busy unlocked', () => {
	renderActions({ action: 'Apply', disabled: true });

	expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
	expect(screen.getByRole('button', { name: 'Apply' })).not.toHaveAttribute('aria-busy');
	expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
});

test('locked, both wait and the action is busy', () => {
	renderActions({ action: 'Roll', locked: true });

	expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
	const roll = screen.getByRole('button', { name: 'Roll' });
	expect(roll).toBeDisabled();
	expect(roll).toHaveAttribute('aria-busy', 'true');
});

test('done, Done alone closes the modal', async () => {
	const user = userEvent.setup();
	const bound = renderActions({ action: 'Roll', done: true });

	expect(screen.queryByRole('button', { name: 'Roll' })).not.toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: 'Done' }));
	expect(bound.open).toBe(false);
});

test('Cancel can be renamed, and more buttons go first', () => {
	renderActions({
		cancelLabel: 'Proceed Anyway',
		children: createRawSnippet(() => ({ render: () => '<button>Rouse Again</button>' }))
	});

	expect(screen.getAllByRole('button').map((button) => button.textContent?.trim())).toEqual([
		'Rouse Again',
		'Proceed Anyway'
	]);
});
