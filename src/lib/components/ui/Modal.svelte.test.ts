import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet, type Snippet } from 'svelte';
import { expect, test } from 'vitest';

import Modal from './Modal.svelte';

/** A snippet rendering fixed HTML. */
const html = (markup: string): Snippet => createRawSnippet(() => ({ render: () => markup }));

/** The props a test may set; the rest have defaults. */
type ModalProps = Partial<{
	title: string | Snippet;
	header: Snippet;
	description: Snippet;
	role: 'dialog' | 'alertdialog';
	closeOnEscape: boolean;
}>;

/** Render the modal open, with `open` as state so its closing shows. Returns that state. */
const renderModal = (props: ModalProps = {}): { open: boolean } => {
	const bound = $state({ open: true });
	render(Modal, {
		title: 'Take Damage',
		children: html('<button>Apply</button>'),
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

test('shows the title and content', async () => {
	renderModal();

	const dialog = await screen.findByRole('dialog', { name: 'Take Damage' });
	expect(within(dialog).getByRole('button', { name: 'Apply' })).toBeInTheDocument();
});

test('takes a snippet for the title', async () => {
	renderModal({ title: html('<span>Frenzy Failure</span>') });

	expect(await screen.findByRole('dialog', { name: 'Frenzy Failure' })).toBeInTheDocument();
});

test('the description describes the dialog', async () => {
	renderModal({ description: html('<p>Saving overwrites them.</p>'), header: html('<i>👑</i>') });

	const dialog = await screen.findByRole('dialog');
	expect(dialog).toHaveAccessibleDescription('Saving overwrites them.');
	expect(dialog).toHaveTextContent('👑');
});

test('can be an alert dialog', async () => {
	renderModal({ role: 'alertdialog' });

	expect(await screen.findByRole('alertdialog', { name: 'Take Damage' })).toBeInTheDocument();
});

test('Escape closes it', async () => {
	const user = userEvent.setup();
	const bound = renderModal();
	const dialog = await screen.findByRole('dialog');
	await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

	await user.keyboard('{Escape}');

	expect(bound.open).toBe(false);
});

test('Escape can be turned off, as while a request runs', async () => {
	const user = userEvent.setup();
	const bound = renderModal({ closeOnEscape: false });
	const dialog = await screen.findByRole('dialog');
	await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

	await user.keyboard('{Escape}');

	expect(bound.open).toBe(true);
});
