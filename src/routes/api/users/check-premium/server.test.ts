import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';

import { GET } from './+server';

vi.mock('$env/static/private', () => ({ API_KEY: 'test-key', INCONNU_API_URL: 'http://api' }));

let fetchMock: Mock<typeof fetch>;

/** A GET request event for the premium check, as the given Discord user (or signed out). */
const event = (userId: string | null = '222'): Parameters<typeof GET>[0] => {
	const session = userId ? { user: { id: userId } } : null;
	return {
		request: new Request('http://localhost/api/users/check-premium'),
		locals: { auth: async () => session }
	} as unknown as Parameters<typeof GET>[0];
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

test('asks the API as the signed-in user, and relays its answer', async () => {
	fetchMock.mockResolvedValueOnce(Response.json({ is_supporter: true }));

	const response = await GET(event());

	expect(fetchMock).toHaveBeenCalledWith('http://api/users/check-premium', {
		headers: { Authorization: 'Bearer test-key', 'X-Discord-User-ID': '222' },
		signal: expect.any(AbortSignal)
	});
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ is_supporter: true });
});

test('a signed-out viewer gets a 401, without asking the API', async () => {
	const response = await GET(event(null));

	expect(response.status).toBe(401);
	expect(fetchMock).not.toHaveBeenCalled();
});

test('an unreachable API is a 502', async () => {
	fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

	const response = await GET(event());

	expect(response.status).toBe(502);
});
