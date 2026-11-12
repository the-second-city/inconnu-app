import { expect, test, vi } from 'vitest';

import type { Docs } from '$lib/server/docs';
import { load } from './+page.server';

const DOCS: Docs = {
	version: 'v1',
	nav: [
		{ title: null, items: [{ title: 'Quickstart', path: 'quickstart', url: null, children: [] }] }
	],
	pages: new Map([
		[
			'quickstart',
			{ path: 'quickstart', title: 'Quickstart', description: null, html: '<p>Hi</p>' }
		]
	]),
	redirects: { 'old/page': 'quickstart#rolling' }
};

vi.mock('$lib/server/docs', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/docs')>()),
	getDocs: async () => DOCS
}));
vi.mock('$env/static/private', () => ({ API_KEY: 'test-key', INCONNU_API_URL: 'http://api' }));

/** Run the page's load function for a docs path. */
const loadPath = (path: string): ReturnType<typeof load> => {
	const event = { params: { path }, parent: async () => ({}) };
	return load(event as unknown as Parameters<typeof load>[0]);
};

test('loads a page', async () => {
	expect(await loadPath('quickstart')).toMatchObject({ page: { title: 'Quickstart' } });
});

test('redirects an old path, keeping its anchor', async () => {
	await expect(loadPath('old/page')).rejects.toMatchObject({
		status: 301,
		location: '/docs/quickstart#rolling'
	});
});

test.each(['missing', 'constructor', '__proto__', 'toString', 'hasOwnProperty'])(
	'%s is not found',
	async (path: string) => {
		await expect(loadPath(path)).rejects.toMatchObject({ status: 404 });
	}
);
