import { render, screen } from '@testing-library/svelte';
import type { ComponentProps } from 'svelte';
import { beforeEach, expect, test, vi } from 'vitest';

import StatusError from './StatusError.svelte';

const page = vi.hoisted(() => ({
	status: 200,
	error: null as { message: string } | null
}));

vi.mock('$app/state', () => ({ page }));

const PROPS: ComponentProps<typeof StatusError> = {
	notFoundHeading: 'Character not found',
	notFoundMessage: 'That character does not exist.',
	invalidHeading: 'Invalid ID',
	invalidMessage: 'That is not a character ID.',
	backHref: '/characters',
	backLabel: 'Back to characters',
	backTitle: 'View your characters'
};

/** Render the error page for an HTTP status, with an optional error message. */
const renderStatus = (status: number, message: string | null = null, props = PROPS) => {
	page.status = status;
	page.error = message === null ? null : { message };
	render(StatusError, props);
};

beforeEach(() => {
	page.status = 200;
	page.error = null;
});

test.each([
	[503, 'Starting up', 'Inconnu is still starting up. Please wait a moment and try again.'],
	[500, 'Connection error', 'Unable to connect to bot. Please try again later.'],
	[404, 'Character not found', 'That character does not exist.'],
	[422, 'Invalid ID', 'That is not a character ID.']
])('explains a %i', (status, heading, message) => {
	renderStatus(status);

	expect(screen.getByRole('heading', { level: 1, name: String(status) })).toBeInTheDocument();
	expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
	expect(screen.getByText(message)).toBeInTheDocument();
});

test.each([
	[503, 'Service Starting | Inconnu'],
	[500, 'Connection Error | Inconnu'],
	[404, 'Character not found | Inconnu'],
	[422, 'Invalid ID | Inconnu'],
	[403, 'Error | Inconnu']
])('titles a %i page', (status, title) => {
	renderStatus(status);

	expect(document.title).toBe(title);
});

test('a 422 without custom text is a generic error', () => {
	renderStatus(422, 'Bad request', {
		...PROPS,
		invalidHeading: undefined,
		invalidMessage: undefined
	});

	expect(
		screen.getByRole('heading', { level: 2, name: 'Something went wrong' })
	).toBeInTheDocument();
	expect(screen.getByText('Bad request')).toBeInTheDocument();
});

test("other errors show the error's message", () => {
	renderStatus(403, 'You are not in this server');

	expect(
		screen.getByRole('heading', { level: 2, name: 'Something went wrong' })
	).toBeInTheDocument();
	expect(screen.getByText('You are not in this server')).toBeInTheDocument();
});

test('other errors without a message fall back to a generic one', () => {
	renderStatus(403);

	expect(
		screen.getByText('An unexpected error occurred. Please try again later.')
	).toBeInTheDocument();
});

test('links back', () => {
	renderStatus(404);

	const link = screen.getByRole('link', { name: 'Back to characters' });
	expect(link).toHaveAttribute('href', '/characters');
	expect(link).toHaveAttribute('title', 'View your characters');
});
