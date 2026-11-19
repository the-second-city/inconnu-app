import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';

import { POST } from './+server';

vi.mock('$env/static/private', () => ({ API_KEY: 'test-key', INCONNU_API_URL: 'http://api' }));

const ID = '613d3e4bba8a6a8dc0ee2a09';

let fetchMock: Mock<typeof fetch>;

/** A POST request event for damaging the character, as the given Discord user (or signed out). */
const event = (body: string, userId: string | null = '222'): Parameters<typeof POST>[0] => {
	const request = new Request(`http://localhost/api/characters/${ID}/damage`, {
		method: 'POST',
		body
	});
	const session = userId ? { user: { id: userId } } : null;
	return {
		params: { id: ID },
		request,
		locals: { auth: async () => session }
	} as unknown as Parameters<typeof POST>[0];
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

test('relays the damage to the API as the signed-in user, and its 204', async () => {
	fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
	const body = '{"track":"health","superficial":2,"aggravated":1}';

	const response = await POST(event(body));

	expect(fetchMock).toHaveBeenCalledWith(`http://api/characters/${ID}/damage`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Bearer test-key',
			'X-Discord-User-ID': '222'
		},
		body
	});
	expect(response.status).toBe(204);
	expect(await response.text()).toBe('');
});

test('a signed-out viewer gets a 401, without asking the API', async () => {
	const response = await POST(event('{}', null));

	expect(response.status).toBe(401);
	expect(fetchMock).not.toHaveBeenCalled();
});

test('invalid JSON is a 400', async () => {
	await expect(POST(event('not json'))).rejects.toMatchObject({ status: 400 });
	expect(fetchMock).not.toHaveBeenCalled();
});

test("the API's errors are relayed", async () => {
	const detail = [{ loc: ['body'], msg: 'Deal at least one damage.', type: 'value_error' }];
	fetchMock.mockResolvedValueOnce(Response.json({ detail }, { status: 422 }));

	const response = await POST(event('{}'));

	expect(response.status).toBe(422);
	expect(await response.json()).toEqual({ detail });
});
