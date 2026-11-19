import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';

import { PATCH } from './+server';

vi.mock('$env/static/private', () => ({ API_KEY: 'test-key', INCONNU_API_URL: 'http://api' }));

const ID = '613d3e4bba8a6a8dc0ee2a09';

let fetchMock: Mock<typeof fetch>;

/** A PATCH request event for the character, as the given Discord user (or signed out). */
const event = (body: string, userId: string | null = '222'): Parameters<typeof PATCH>[0] => {
	const request = new Request(`http://localhost/api/characters/${ID}`, { method: 'PATCH', body });
	const session = userId ? { user: { id: userId } } : null;
	return {
		params: { id: ID },
		request,
		locals: { auth: async () => session }
	} as unknown as Parameters<typeof PATCH>[0];
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

test('relays the edit to the API as the signed-in user', async () => {
	fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

	const response = await PATCH(event('{"name":"Nadia"}'));

	expect(fetchMock).toHaveBeenCalledWith(`http://api/characters/${ID}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Bearer test-key',
			'X-Discord-User-ID': '222'
		},
		body: '{"name":"Nadia"}'
	});
	expect(response.status).toBe(204);
	expect(await response.text()).toBe('');
});

test("relays the API's errors with their JSON bodies", async () => {
	const detail = [{ loc: ['body', 'name'], msg: 'Value error, Invalid name', type: 'value_error' }];
	fetchMock.mockResolvedValueOnce(Response.json({ detail }, { status: 422 }));

	const response = await PATCH(event('{}'));

	expect(response.status).toBe(422);
	expect(await response.json()).toEqual({ detail });
});

test("doesn't pass the API's headers through", async () => {
	fetchMock.mockResolvedValueOnce(
		Response.json({ detail: 'Nope' }, { status: 403, headers: { 'X-Internal': 'secret' } })
	);

	const response = await PATCH(event('{}'));

	expect(response.headers.get('X-Internal')).toBeNull();
	expect(response.headers.get('Cache-Control')).toBe('no-store');
});

test('a signed-out viewer gets a 401, without asking the API', async () => {
	const response = await PATCH(event('{}', null));

	expect(response.status).toBe(401);
	expect(fetchMock).not.toHaveBeenCalled();
});

test('invalid JSON is a 400', async () => {
	await expect(PATCH(event('not json'))).rejects.toMatchObject({ status: 400 });
	expect(fetchMock).not.toHaveBeenCalled();
});

test.each([
	['an unreachable API', () => Promise.reject(new TypeError('fetch failed'))],
	['a non-JSON answer', async () => new Response('<html>Bad gateway</html>', { status: 502 })]
])('%s is a 502', async (_, answer) => {
	fetchMock.mockImplementationOnce(answer);

	const response = await PATCH(event('{}'));

	expect(response.status).toBe(502);
	expect(await response.json()).toEqual({
		message: "Couldn't reach Inconnu to save your changes."
	});
});

test("the API refusing our API key is a 502, not the viewer's 401", async () => {
	fetchMock.mockResolvedValueOnce(Response.json({ detail: 'Invalid API key' }, { status: 401 }));

	const response = await PATCH(event('{}'));

	expect(response.status).toBe(502);
	expect(await response.json()).toEqual({
		message: "Couldn't reach Inconnu to save your changes."
	});
});
