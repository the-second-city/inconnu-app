import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';

import { GET, POST } from './+server';

vi.mock('$env/static/private', () => ({ API_KEY: 'test-key', INCONNU_API_URL: 'http://api' }));

const TOKEN = 'frivolous-giraffe-wench';

let fetchMock: Mock<typeof fetch>;

/** A request event for the wizard endpoint, with an optional JSON or raw body. */
const event = (body?: string): Parameters<typeof GET>[0] => {
	const request = new Request(`http://localhost/api/wizard/${TOKEN}`, {
		method: body === undefined ? 'GET' : 'POST',
		body
	});
	return { params: { token: TOKEN }, request } as unknown as Parameters<typeof GET>[0];
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

test('GET asks the API for the wizard with the API key', async () => {
	fetchMock.mockResolvedValueOnce(Response.json({ spc: false }));

	const response = await GET(event());

	expect(fetchMock).toHaveBeenCalledWith(`http://api/characters/wizard/${TOKEN}`, {
		headers: { Authorization: 'Bearer test-key' }
	});
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ spc: false });
});

test('POST forwards the character to the API', async () => {
	fetchMock.mockResolvedValueOnce(Response.json({ character_id: 'abc' }, { status: 201 }));

	const response = await POST(event('{"name":"Nadea"}'));

	const [url, init] = fetchMock.mock.calls[0];
	expect(url).toBe(`http://api/characters/wizard/${TOKEN}`);
	expect(init).toMatchObject({ method: 'POST', body: '{"name":"Nadea"}' });
	expect(response.status).toBe(201);
	expect(await response.json()).toEqual({ character_id: 'abc' });
});

test("relays the API's errors", async () => {
	fetchMock.mockResolvedValueOnce(Response.json({ detail: 'Unknown token.' }, { status: 404 }));

	const response = await GET(event());

	expect(response.status).toBe(404);
	expect(await response.json()).toEqual({ detail: 'Unknown token.' });
});

test("drops the API's headers", async () => {
	fetchMock.mockResolvedValueOnce(
		new Response('{}', {
			headers: { 'Content-Type': 'text/html', 'Set-Cookie': 'a=b', Server: 'uvicorn' }
		})
	);

	const response = await GET(event());

	expect(Object.fromEntries(response.headers)).toEqual({
		'cache-control': 'no-store',
		'content-length': '2',
		'content-type': 'application/json'
	});
	expect(await response.json()).toEqual({});
});

test('relays a status with no body', async () => {
	fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

	const response = await GET(event());

	expect(response.status).toBe(204);
	expect(await response.text()).toBe('');
});

/** A response whose body fails partway through, like a dropped connection. */
const interrupted = (): Response =>
	new Response(
		new ReadableStream({
			start(controller) {
				controller.error(new TypeError('terminated'));
			}
		})
	);

test.each([
	['an unreachable API', () => Promise.reject(new TypeError('fetch failed'))],
	['a body that is not JSON', () => Promise.resolve(new Response('<h1>Bad Gateway</h1>'))],
	['an interrupted body', () => Promise.resolve(interrupted())]
])('reports %s as a 502', async (_name: string, respond: () => Promise<Response>) => {
	fetchMock.mockImplementationOnce(respond);

	const response = await GET(event());

	expect(response.status).toBe(502);
	expect(await response.json()).toEqual({
		message: 'The character wizard is unavailable right now.'
	});
});

test('POST rejects a body that is not JSON', async () => {
	await expect(POST(event('not json'))).rejects.toMatchObject({ status: 400 });
	expect(fetchMock).not.toHaveBeenCalled();
});
