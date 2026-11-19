import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';

import { POST } from './+server';

vi.mock('$env/static/private', () => ({ API_KEY: 'test-key', INCONNU_API_URL: 'http://api' }));

const ID = '613d3e4bba8a6a8dc0ee2a09';

let fetchMock: Mock<typeof fetch>;

/** A POST request event for testing the character's Remorse, as the given Discord user (or signed out). */
const event = (body: string, userId: string | null = '222'): Parameters<typeof POST>[0] => {
	const request = new Request(`http://localhost/api/characters/${ID}/remorse`, {
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

test('relays the test to the API as the signed-in user, and its result', async () => {
	const result = { remorseful: false, dice: [3, 5], humanity: 6 };
	fetchMock.mockResolvedValueOnce(Response.json(result));
	const body = '{"min_override":1,"lasombra_alt":false}';

	const response = await POST(event(body));

	expect(fetchMock).toHaveBeenCalledWith(`http://api/characters/${ID}/remorse`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Bearer test-key',
			'X-Discord-User-ID': '222'
		},
		body
	});
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual(result);
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
	const detail = [{ loc: ['body'], msg: 'Nadia has no Stains.', type: 'value_error' }];
	fetchMock.mockResolvedValueOnce(Response.json({ detail }, { status: 422 }));

	const response = await POST(event('{}'));

	expect(response.status).toBe(422);
	expect(await response.json()).toEqual({ detail });
});
