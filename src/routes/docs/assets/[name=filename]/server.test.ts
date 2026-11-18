import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';

import { GET } from './+server';

vi.mock('$env/static/private', () => ({ API_KEY: 'test-key', INCONNU_API_URL: 'http://api' }));

let fetchMock: Mock<typeof fetch>;

/** A GET request event for the named docs asset. */
const event = (name: string): Parameters<typeof GET>[0] =>
	({ params: { name } }) as unknown as Parameters<typeof GET>[0];

/** An upstream asset response of the given content type. */
const asset = (type: string | null, status = 200): Response => {
	const headers = new Headers();
	if (type) headers.set('Content-Type', type);
	return new Response('bytes', { status, headers });
};

/** The HTTP status a handler threw (SvelteKit's `error()`), or null if it returned. */
const thrownStatus = async (name: string): Promise<number | null> => {
	try {
		await GET(event(name));
		return null;
	} catch (err) {
		return (err as { status: number }).status;
	}
};

beforeEach(() => {
	fetchMock = vi.fn<typeof fetch>();
	vi.stubGlobal('fetch', fetchMock);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

test.each(['image/png', 'image/webp', 'IMAGE/JPEG; charset=binary'])(
	'serves %s with its type, and no sniffing',
	async (type) => {
		fetchMock.mockResolvedValueOnce(asset(type));

		const response = await GET(event('roll.png'));

		expect(fetchMock).toHaveBeenCalledWith('http://api/docs/assets/roll.png', {
			headers: { Authorization: 'Bearer test-key' }
		});
		expect(response.headers.get('Content-Type')).toBe(type.split(';')[0].toLowerCase());
		expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(await response.text()).toBe('bytes');
	}
);

test.each(['image/svg+xml', 'text/html', 'application/octet-stream', null])(
	'refuses an asset of type %s, which could run script from the app',
	async (type) => {
		fetchMock.mockResolvedValueOnce(asset(type));

		expect(await thrownStatus('evil.svg')).toBe(404);
	}
);

test.each([
	[404, 404],
	[500, 502]
])('an upstream %i is a %i', async (upstream, status) => {
	fetchMock.mockResolvedValueOnce(asset('text/plain', upstream));

	expect(await thrownStatus('missing.png')).toBe(status);
});
