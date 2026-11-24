import { render, screen } from '@testing-library/svelte';
import { afterEach, expect, test, vi } from 'vitest';

import { page } from '$lib/testing/page.svelte';
import ErrorPage from './+error.svelte';

vi.mock('$app/state', () => import('$lib/testing/page.svelte'));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

/** Shows the error page for a status and message. */
const renderError = (status: number, message: string): void => {
	page.status = status;
	page.error = { message };
	render(ErrorPage);
};

afterEach(() => {
	page.status = 200;
	page.error = null;
});

test('a 404 says the page wasn’t found', () => {
	renderError(404, 'Not Found');

	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('404');
	expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Not found');
});

test('another error shows its status and message, not a 404', () => {
	renderError(503, 'The docs are unavailable right now. Please try again shortly.');

	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('503');
	expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Something went wrong');
	expect(
		screen.getByText('The docs are unavailable right now. Please try again shortly.')
	).toBeInTheDocument();
	expect(screen.queryByText('Not found')).not.toBeInTheDocument();
});

test('an unexpected error doesn’t show SvelteKit’s bare “Internal Error”', () => {
	renderError(500, 'Internal Error');

	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('500');
	expect(screen.queryByText('Internal Error')).not.toBeInTheDocument();
	expect(screen.getByText('Please try again in a moment.')).toBeInTheDocument();
});
