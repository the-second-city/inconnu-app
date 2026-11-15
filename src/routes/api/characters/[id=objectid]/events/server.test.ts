import { isHttpError } from '@sveltejs/kit';
import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';

import { GET } from './+server';

vi.mock('$env/static/private', () => ({ API_KEY: 'test-key', INCONNU_API_URL: 'http://api' }));

const ID = '0123456789abcdef01234567';
const USER = '222';

let fetchMock: Mock<typeof fetch>;

/** A request event for the events endpoint, signed in as `user` (or signed out, for null), whose
 * request aborts with `signal`. */
const event = (user: string | null = USER, signal?: AbortSignal): Parameters<typeof GET>[0] => {
	const session = user === null ? null : { user: { id: user }, expires: '' };
	return {
		locals: { auth: async () => session },
		params: { id: ID },
		request: new Request(`http://localhost/api/characters/${ID}/events`, { signal })
	} as unknown as Parameters<typeof GET>[0];
};

/** Call the endpoint, returning the HTTP error it throws (or failing if it doesn't throw one). */
const httpError = async (ev: Parameters<typeof GET>[0]): Promise<{ status: number }> => {
	try {
		await GET(ev);
	} catch (err) {
		if (isHttpError(err)) return err;
		throw err;
	}
	throw new Error('Expected an HTTP error');
};

/** An upstream event stream that sends `text`, then ends. */
const stream = (text: string): Response =>
	new Response(text, {
		headers: { 'Content-Type': 'text/event-stream', 'X-Upstream': 'secret' }
	});

beforeEach(() => {
	fetchMock = vi.fn<typeof fetch>();
	vi.stubGlobal('fetch', fetchMock);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

test('asks the API for the stream as the signed-in user', async () => {
	fetchMock.mockResolvedValueOnce(stream('retry: 5000\n\n'));

	await GET(event());

	const [url, init] = fetchMock.mock.calls[0];
	expect(url).toBe(`http://api/characters/${ID}/events`);
	expect(init?.headers).toEqual({
		Accept: 'text/event-stream',
		Authorization: 'Bearer test-key',
		'X-Discord-User-ID': USER
	});
});

test('relays the stream, without the API headers', async () => {
	fetchMock.mockResolvedValueOnce(stream('retry: 5000\n\ndata: changed\n\n'));

	const response = await GET(event());

	expect(response.status).toBe(200);
	expect(response.headers.get('Content-Type')).toBe('text/event-stream');
	expect(response.headers.get('Cache-Control')).toBe('no-cache');
	expect(response.headers.get('X-Upstream')).toBeNull();
	expect(await response.text()).toBe('retry: 5000\n\ndata: changed\n\n');
});

test('tells a signed-out viewer to stop listening', async () => {
	const response = await GET(event(null));

	expect(response.headers.get('Content-Type')).toBe('text/event-stream');
	expect(await response.text()).toBe('data: gone\n\n');
	expect(fetchMock).not.toHaveBeenCalled();
});

test.each([403, 404])(
	'tells the viewer to stop listening when the API refuses with %i',
	async (status) => {
		fetchMock.mockResolvedValueOnce(Response.json({ detail: 'No' }, { status }));

		const response = await GET(event());

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('data: gone\n\n');
	}
);

test.each([401, 422])('reports the API refusing with %i as a 502', async (status) => {
	fetchMock.mockResolvedValueOnce(Response.json({ detail: 'No' }, { status }));

	expect((await httpError(event())).status).toBe(502);
	expect(console.error).toHaveBeenCalled();
});

test("reports a response that isn't an event stream as a 502", async () => {
	fetchMock.mockResolvedValueOnce(Response.json({ ok: true }));

	expect((await httpError(event())).status).toBe(502);
});

test.each([500, 503])('relays the API failing with %i', async (status) => {
	fetchMock.mockResolvedValueOnce(Response.json({ detail: 'No' }, { status }));

	expect((await httpError(event())).status).toBe(status);
});

test('reports an unreachable API as a 502', async () => {
	fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

	expect((await httpError(event())).status).toBe(502);
});

test("doesn't log the browser leaving before the API answers", async () => {
	const controller = new AbortController();
	fetchMock.mockImplementationOnce(async () => {
		controller.abort();
		throw new DOMException('Aborted', 'AbortError');
	});

	await httpError(event(USER, controller.signal));

	expect(console.error).not.toHaveBeenCalled();
});

test('logs an unreachable API', async () => {
	fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

	await httpError(event());

	expect(console.error).toHaveBeenCalled();
});
