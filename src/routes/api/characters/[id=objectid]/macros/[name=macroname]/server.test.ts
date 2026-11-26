import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';

import { DELETE, PUT } from './+server';

vi.mock('$env/static/private', () => ({ API_KEY: 'test-key', INCONNU_API_URL: 'http://api' }));

const ID = '613d3e4bba8a6a8dc0ee2a09';

let fetchMock: Mock<typeof fetch>;

/** A DELETE request event for the character's `name` macro, as the given Discord user (or signed out). */
const event = (name: string, userId: string | null = '222'): Parameters<typeof DELETE>[0] => {
	const request = new Request(`http://localhost/api/characters/${ID}/macros/${name}`, {
		method: 'DELETE'
	});
	const session = userId ? { user: { id: userId } } : null;
	return {
		params: { id: ID, name },
		request,
		locals: { auth: async () => session }
	} as unknown as Parameters<typeof DELETE>[0];
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

test('relays the delete to the API as the signed-in user, without a body, and its 204', async () => {
	fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

	const response = await DELETE(event('Blood_Surge'));

	expect(fetchMock).toHaveBeenCalledWith(`http://api/characters/${ID}/macros/Blood_Surge`, {
		method: 'DELETE',
		headers: { Authorization: 'Bearer test-key', 'X-Discord-User-ID': '222' },
		body: undefined,
		signal: expect.any(AbortSignal)
	});
	expect(response.status).toBe(204);
});

test('a signed-out viewer gets a 401, without asking the API', async () => {
	const response = await DELETE(event('feed', null));

	expect(response.status).toBe(401);
	expect(fetchMock).not.toHaveBeenCalled();
});

test("the API's 404 is relayed", async () => {
	fetchMock.mockResolvedValueOnce(Response.json({ detail: 'Macro not found' }, { status: 404 }));

	const response = await DELETE(event('feed'));

	expect(response.status).toBe(404);
	expect(await response.json()).toEqual({ detail: 'Macro not found' });
});

test('relays an update to the API as the signed-in user, by its current name, and its 204', async () => {
	fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
	const body = '{"name":"hunt","pool":["Strength"]}';
	const base = event('feed');
	const request = new Request(base.request.url, { method: 'PUT', body });

	const response = await PUT({ ...base, request } as unknown as Parameters<typeof PUT>[0]);

	expect(fetchMock).toHaveBeenCalledWith(`http://api/characters/${ID}/macros/feed`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Bearer test-key',
			'X-Discord-User-ID': '222'
		},
		body,
		signal: expect.any(AbortSignal)
	});
	expect(response.status).toBe(204);
});
