import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';

import { isSupporter } from './premium';

vi.mock('$app/paths', () => ({ resolve: (route: string) => route }));

let fetchMock: Mock<typeof fetch>;

beforeEach(() => {
	fetchMock = vi.fn<typeof fetch>();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

test.each([
	[{ is_supporter: true }, true],
	[{ is_supporter: false }, false],
	[{}, false]
])('the API answering %j means %s', async (body, expected) => {
	fetchMock.mockResolvedValueOnce(Response.json(body));

	expect(await isSupporter()).toBe(expected);
	expect(fetchMock).toHaveBeenCalledWith('/api/users/check-premium');
});

test("a failed check doesn't block a supporter", async () => {
	fetchMock.mockResolvedValueOnce(Response.json({ message: 'Down' }, { status: 502 }));
	expect(await isSupporter()).toBe(true);

	fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
	expect(await isSupporter()).toBe(true);
});
