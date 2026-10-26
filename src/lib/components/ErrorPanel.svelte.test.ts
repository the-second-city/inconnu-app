import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { expect, test, vi } from 'vitest';

import ErrorPanel from './ErrorPanel.svelte';

vi.mock('$app/paths', () => ({
	resolve: (route: string) => route
}));

test('shows the title, subtitle, and a link home', () => {
	render(ErrorPanel, { title: 'Not Found', subtitle: 'That post is gone' });

	expect(screen.getByRole('heading', { level: 1, name: 'Not Found' })).toBeInTheDocument();
	expect(screen.getByRole('heading', { level: 2, name: 'That post is gone' })).toBeInTheDocument();
	expect(screen.getByRole('link', { name: 'Return Home' })).toHaveAttribute('href', '/');
});

test('leaves out the subtitle when there is none', () => {
	render(ErrorPanel, { title: 'Not Found' });

	expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
});

test('can hide the link home', () => {
	render(ErrorPanel, { title: 'Not Found', showHome: false });

	expect(screen.queryByRole('link', { name: 'Return Home' })).not.toBeInTheDocument();
});

test('renders its children', () => {
	const children = createRawSnippet(() => ({ render: () => '<p>Try signing in again.</p>' }));
	render(ErrorPanel, { title: 'Not Found', children });

	expect(screen.getByText('Try signing in again.')).toBeInTheDocument();
});
