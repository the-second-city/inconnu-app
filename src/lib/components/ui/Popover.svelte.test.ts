import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { expect, test, vi } from 'vitest';

import Popover from './Popover.svelte';

/** A snippet rendering fixed HTML. */
const html = (markup: string) => createRawSnippet(() => ({ render: () => markup }));

/** Render a popover with an "Info" trigger and a short message. */
const renderPopover = (props: Partial<{ triggerLabel: string; open: boolean }> = {}) => {
	const onOpenChange = vi.fn();
	render(Popover, {
		trigger: html('<span>Info</span>'),
		content: html('<p>Hello there</p>'),
		onOpenChange,
		...props
	});
	return { onOpenChange };
};

test('is closed at first', () => {
	renderPopover();

	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('clicking the trigger opens it', async () => {
	const user = userEvent.setup();
	const { onOpenChange } = renderPopover();

	await user.click(screen.getByRole('button', { name: 'Info' }));

	expect(await screen.findByRole('dialog')).toHaveTextContent('Hello there');
	expect(onOpenChange).toHaveBeenLastCalledWith(true);
});

test('can start open', async () => {
	renderPopover({ open: true });

	expect(await screen.findByRole('dialog')).toHaveTextContent('Hello there');
});

test('Escape closes it', async () => {
	const user = userEvent.setup();
	const { onOpenChange } = renderPopover();
	const trigger = screen.getByRole('button', { name: 'Info' });
	await user.click(trigger);
	await waitFor(() => expect(trigger).not.toHaveFocus());

	await user.keyboard('{Escape}');

	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	expect(onOpenChange).toHaveBeenLastCalledWith(false);
});

test('the trigger can be given a name', () => {
	renderPopover({ triggerLabel: 'About this' });

	expect(screen.getByRole('button', { name: 'About this' })).toBeInTheDocument();
});
