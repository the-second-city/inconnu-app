import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { beforeEach, expect, test, vi } from 'vitest';

import NavLink from './NavLink.svelte';

const page = vi.hoisted(() => ({ url: new URL('http://localhost/') }));

vi.mock('$app/state', () => ({ page }));
vi.mock('$app/paths', () => ({
	resolve: (route: string) => route
}));

const children = createRawSnippet(() => ({ render: () => '<span>Docs</span>' }));

/** Render the Docs nav link while viewing `pathname`. */
const renderAt = (pathname: string) => {
	page.url = new URL(pathname, 'http://localhost');
	render(NavLink, { href: '/docs', title: 'Read the docs', children });
};

beforeEach(() => {
	page.url = new URL('http://localhost/');
});

test('links to its route', () => {
	renderAt('/');

	const link = screen.getByRole('link', { name: 'Docs' });
	expect(link).toHaveAttribute('href', '/docs');
	expect(link).toHaveAttribute('title', 'Read the docs');
});

test.each(['/docs', '/docs/guides/macros'])('is current while viewing %s', (pathname) => {
	renderAt(pathname);

	expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('aria-current', 'page');
});

test('is not current elsewhere', () => {
	renderAt('/characters');

	expect(screen.getByRole('link', { name: 'Docs' })).not.toHaveAttribute('aria-current');
});
