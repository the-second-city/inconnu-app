import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import type { DocsNavItem, DocsNavSection } from '$lib/types';
import DocsNav from './DocsNav.svelte';

// SvelteKit's router isn't running in tests; build docs URLs the same way it would
vi.mock('$app/paths', () => ({
	resolve: (_route: string, params?: { path: string }) =>
		params?.path ? `/docs/${params.path}` : '/docs'
}));

/** A sidebar entry for a docs page. */
const page = (title: string, path: string, children: DocsNavItem[] = []): DocsNavItem => ({
	title,
	path,
	url: null,
	children
});

const NAV: DocsNavSection[] = [
	{ title: null, items: [page('Introduction', '')] },
	{
		title: 'Guides',
		items: [
			page('Quickstart', 'guides/quickstart', [
				page('Specialties', 'guides/quickstart/specialties'),
				page('Trackers', 'guides/quickstart/trackers')
			]),
			page('Macros', 'guides/macros')
		]
	},
	{
		title: 'Command Reference',
		items: [
			page('Rolls', 'command-reference/rolls', [
				page('Impairment', 'command-reference/rolls/impairment')
			])
		]
	},
	{
		title: null,
		items: [{ title: 'Changelog', path: null, url: 'https://example.com/releases', children: [] }]
	}
];

const KEY = 'test-nav';

/** Render the sidebar as if reading the page at `current`. */
const renderNav = (current: string, storageKey = KEY) =>
	render(DocsNav, { nav: NAV, current, storageKey });

/** Whether a page's link is showing in the sidebar. */
const isShown = (title: string): boolean => screen.queryByRole('link', { name: title }) !== null;

beforeEach(() => {
	sessionStorage.clear();
});

afterEach(() => {
	vi.restoreAllMocks();
});

test('links each page to its docs route, and external links to a new tab', () => {
	renderNav('');

	expect(screen.getByRole('link', { name: 'Macros' })).toHaveAttribute(
		'href',
		'/docs/guides/macros'
	);
	expect(screen.getByRole('link', { name: 'Introduction' })).toHaveAttribute('href', '/docs');
	const changelog = screen.getByRole('link', { name: 'Changelog' });
	expect(changelog).toHaveAttribute('href', 'https://example.com/releases');
	expect(changelog).toHaveAttribute('target', '_blank');
});

test('shows section titles', () => {
	renderNav('');

	expect(screen.getByText('Guides')).toBeInTheDocument();
	expect(screen.getByText('Command Reference')).toBeInTheDocument();
});

test('marks the current page', () => {
	renderNav('guides/macros');

	expect(screen.getByRole('link', { name: 'Macros' })).toHaveAttribute('aria-current', 'page');
	expect(screen.getByRole('link', { name: 'Introduction' })).not.toHaveAttribute('aria-current');
});

test("opens the current page's section and leaves the rest closed", () => {
	renderNav('guides/quickstart/specialties');

	expect(isShown('Specialties')).toBe(true);
	expect(isShown('Impairment')).toBe(false);
	expect(screen.getByRole('button', { name: 'Collapse Quickstart' })).toHaveAttribute(
		'aria-expanded',
		'true'
	);
	expect(screen.getByRole('button', { name: 'Expand Rolls' })).toHaveAttribute(
		'aria-expanded',
		'false'
	);
});

test('only pages with sub-pages get a chevron', () => {
	renderNav('');

	expect(screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
		'Expand Quickstart',
		'Expand Rolls'
	]);
});

test('the chevron opens and closes a section without leaving the page', async () => {
	const user = userEvent.setup();
	renderNav('guides/macros');

	await user.click(screen.getByRole('button', { name: 'Expand Rolls' }));
	expect(isShown('Impairment')).toBe(true);
	expect(screen.getByRole('link', { name: 'Macros' })).toHaveAttribute('aria-current', 'page');

	await user.click(screen.getByRole('button', { name: 'Collapse Rolls' }));
	expect(isShown('Impairment')).toBe(false);
});

test("the current page's section can be closed", async () => {
	const user = userEvent.setup();
	renderNav('guides/quickstart/specialties');

	await user.click(screen.getByRole('button', { name: 'Collapse Quickstart' }));

	expect(isShown('Specialties')).toBe(false);
});

test('sections stay open after moving to another page', async () => {
	const user = userEvent.setup();
	const { rerender } = renderNav('guides/quickstart/specialties');
	await user.click(screen.getByRole('button', { name: 'Expand Rolls' }));

	await rerender({ nav: NAV, current: 'guides/macros', storageKey: KEY });

	expect(isShown('Specialties')).toBe(true);
	expect(isShown('Impairment')).toBe(true);
});

test('arriving at a page reopens its section, even if it was closed', async () => {
	const user = userEvent.setup();
	const { rerender } = renderNav('guides/quickstart/specialties');
	await user.click(screen.getByRole('button', { name: 'Collapse Quickstart' }));

	await rerender({ nav: NAV, current: 'guides/quickstart/trackers', storageKey: KEY });

	expect(isShown('Trackers')).toBe(true);
});

test('open sections are remembered for the session', async () => {
	const user = userEvent.setup();
	const first = renderNav('guides/macros');
	await user.click(screen.getByRole('button', { name: 'Expand Rolls' }));
	first.unmount();

	// A reload renders a fresh sidebar
	renderNav('guides/macros');

	expect(isShown('Impairment')).toBe(true);
});

test('each storage key remembers its own sections', async () => {
	const user = userEvent.setup();
	const sidebar = renderNav('guides/macros', 'sidebar');
	await user.click(screen.getByRole('button', { name: 'Expand Rolls' }));
	sidebar.unmount();

	renderNav('guides/macros', 'contents');

	expect(isShown('Impairment')).toBe(false);
});

test('works without session storage', async () => {
	vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
		throw new Error('Storage is disabled');
	});
	vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
		throw new Error('Storage is disabled');
	});
	const user = userEvent.setup();
	renderNav('guides/macros');

	await user.click(screen.getByRole('button', { name: 'Expand Rolls' }));

	expect(isShown('Impairment')).toBe(true);
});
