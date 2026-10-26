import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';

import type { DocsBundle, DocsNavSection } from '$lib/types';

vi.mock('$env/static/private', () => ({ API_KEY: 'test-key', INCONNU_API_URL: 'http://api' }));

const NAV: DocsNavSection[] = [
	{
		title: null,
		items: [{ title: 'Introduction', path: '', url: null, children: [] }]
	},
	{
		title: 'Guides',
		items: [
			{
				title: 'Quickstart',
				path: 'guides/quickstart',
				url: null,
				children: [
					{ title: 'Specialties', path: 'guides/quickstart/specialties', url: null, children: [] }
				]
			},
			{ title: 'Changelog', path: null, url: 'https://github.com/example/releases', children: [] }
		]
	}
];

/** A docs bundle with a home page and one guide. */
const bundle = (version = 'v1'): DocsBundle => ({
	version,
	nav: NAV,
	pages: [
		{ path: '', file: 'README.md', title: 'Inconnu', description: null, markdown: '# Inconnu\n' },
		{
			path: 'guides/quickstart',
			file: 'guides/quickstart/README.md',
			title: 'Quickstart',
			description: 'Get started.',
			markdown: `# Quickstart\n\nVersion ${version}. Back [home](../../README.md).\n`
		}
	],
	redirects: { 'old/page': 'guides/quickstart' }
});

/** A response from the bot's /docs endpoint. */
const ok = (body: DocsBundle): Response => new Response(JSON.stringify(body), { status: 200 });

let fetchMock: Mock<typeof fetch>;

/** A fresh copy of the docs module, since it caches the docs at module level. */
const loadModule = async () => {
	vi.resetModules();
	return import('./index');
};

beforeEach(() => {
	vi.useFakeTimers();
	fetchMock = vi.fn<typeof fetch>();
	vi.stubGlobal('fetch', fetchMock);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

test('getDocs fetches the bundle with the API key and renders every page', async () => {
	fetchMock.mockResolvedValueOnce(ok(bundle()));
	const { getDocs } = await loadModule();

	const docs = await getDocs();

	expect(fetchMock).toHaveBeenCalledWith('http://api/docs', {
		headers: { Authorization: 'Bearer test-key' }
	});
	expect(docs.version).toBe('v1');
	expect(docs.nav).toEqual(NAV);
	expect(docs.redirects).toEqual({ 'old/page': 'guides/quickstart' });
	expect(docs.pages.get('guides/quickstart')).toMatchObject({
		title: 'Quickstart',
		description: 'Get started.'
	});
	expect(docs.pages.get('guides/quickstart')?.html).toContain('href="/docs"');
});

test('getDocs reuses the docs for a minute without asking again', async () => {
	fetchMock.mockResolvedValueOnce(ok(bundle()));
	const { getDocs } = await loadModule();

	const first = await getDocs();
	vi.advanceTimersByTime(59_000);
	const second = await getDocs();

	expect(second).toBe(first);
	expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('after a minute, getDocs rechecks with the ETag and keeps the docs on a 304', async () => {
	fetchMock.mockResolvedValueOnce(ok(bundle()));
	fetchMock.mockResolvedValueOnce(new Response(null, { status: 304 }));
	const { getDocs } = await loadModule();

	const first = await getDocs();
	vi.advanceTimersByTime(61_000);
	const second = await getDocs();

	expect(second).toBe(first);
	expect(fetchMock).toHaveBeenLastCalledWith('http://api/docs', {
		headers: { Authorization: 'Bearer test-key', 'If-None-Match': '"v1"' }
	});
});

test('getDocs replaces the docs when the bot has a new version', async () => {
	fetchMock.mockResolvedValueOnce(ok(bundle('v1')));
	fetchMock.mockResolvedValueOnce(ok(bundle('v2')));
	const { getDocs } = await loadModule();

	await getDocs();
	vi.advanceTimersByTime(61_000);
	const docs = await getDocs();

	expect(docs.version).toBe('v2');
	expect(docs.pages.get('guides/quickstart')?.html).toContain('Version v2.');
});

test('getDocs serves the last good copy when the bot is down', async () => {
	fetchMock.mockResolvedValueOnce(ok(bundle()));
	fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
	const { getDocs } = await loadModule();

	const first = await getDocs();
	vi.advanceTimersByTime(61_000);

	expect(await getDocs()).toBe(first);
	expect(console.error).toHaveBeenCalled();
});

test('getDocs serves the last good copy when the bot returns an error', async () => {
	fetchMock.mockResolvedValueOnce(ok(bundle()));
	fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }));
	const { getDocs } = await loadModule();

	const first = await getDocs();
	vi.advanceTimersByTime(61_000);

	expect(await getDocs()).toBe(first);
});

test('getDocs fails when the bot is down and there are no docs yet', async () => {
	fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
	const { getDocs } = await loadModule();

	await expect(getDocs()).rejects.toThrow('fetch failed');
});

test("getDocs reports the bot's error detail when there are no docs yet", async () => {
	fetchMock.mockResolvedValueOnce(
		new Response(JSON.stringify({ detail: 'Invalid authentication token' }), { status: 401 })
	);
	const { getDocs } = await loadModule();

	await expect(getDocs()).rejects.toThrow('Invalid authentication token');
});

test('simultaneous requests share one fetch', async () => {
	fetchMock.mockResolvedValueOnce(ok(bundle()));
	const { getDocs } = await loadModule();

	const [a, b, c] = await Promise.all([getDocs(), getDocs(), getDocs()]);

	expect(fetchMock).toHaveBeenCalledTimes(1);
	expect(b).toBe(a);
	expect(c).toBe(a);
});

test('readingOrder lists pages in sidebar order, including sub-pages, without external links', async () => {
	const { readingOrder } = await loadModule();

	expect(readingOrder(NAV)).toEqual([
		{ path: '', title: 'Introduction' },
		{ path: 'guides/quickstart', title: 'Quickstart' },
		{ path: 'guides/quickstart/specialties', title: 'Specialties' }
	]);
});
