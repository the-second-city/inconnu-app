import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';

import { isSupporter, refusedForPremium, showUpsell, upsell } from './premium.svelte';

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

test.each([
	[403, { detail: 'This feature is for supporters only' }, true],
	[403, { detail: 'You do not own this character.' }, false],
	[422, { detail: 'This feature is for supporters only' }, false],
	[403, null, false]
])('a %i with %j is a premium refusal: %s', (status, json, expected) => {
	expect(refusedForPremium(status, json)).toBe(expected);
});

test('showUpsell opens the upsell, naming the feature', () => {
	showUpsell('Editing characters');

	expect(upsell).toEqual({ open: true, feature: 'Editing characters' });
});
