import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';

import { PATCH } from './+server';

vi.mock('$env/static/private', () => ({ API_KEY: 'test-key', INCONNU_API_URL: 'http://api' }));

const ID = '613d3e4bba8a6a8dc0ee2a09';

let fetchMock: Mock<typeof fetch>;

/** A PATCH request event saving the macros, as the given Discord user (or signed out). */
const event = (body: string, userId: string | null = '222'): Parameters<typeof PATCH>[0] => {
	const request = new Request(`http://localhost/api/characters/${ID}/macros`, {
		method: 'PATCH',
		body
	});
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

test('relays the macros to the API as the signed-in user, and its 204', async () => {
	fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
	const body = '{"macros":[{"name":"feed","pool":["Strength"]}]}';

	const response = await PATCH(event(body));

	expect(fetchMock).toHaveBeenCalledWith(`http://api/characters/${ID}/macros`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Bearer test-key',
			'X-Discord-User-ID': '222'
		},
		body,
		signal: expect.any(AbortSignal)
	});
	expect(response.status).toBe(204);
	expect(await response.text()).toBe('');
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

test("the API's errors are relayed", async () => {
	const detail = [{ loc: ['body'], msg: 'Nadia has no trait named Melee.', type: 'value_error' }];
	fetchMock.mockResolvedValueOnce(Response.json({ detail }, { status: 422 }));

	const response = await PATCH(event('{}'));

	expect(response.status).toBe(422);
	expect(await response.json()).toEqual({ detail });
});
