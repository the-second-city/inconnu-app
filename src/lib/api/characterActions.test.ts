import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';

import {
	actionError,
	damage,
	mend,
	postAction,
	remorse,
	rouse,
	slake,
	stain
} from '$lib/api/characterActions';
import { upsell } from '$lib/state/premium.svelte';
import type { MendResult, RouseResult } from '$lib/types';

vi.mock('$app/paths', () => ({
	resolve: (route: string, params: Record<string, string>) =>
		route.replace('[id=objectid]', params.id)
}));

let fetchMock: Mock<typeof fetch>;

beforeEach(() => {
	upsell.open = false;
	fetchMock = vi.fn<typeof fetch>();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

const RESULT: RouseResult = {
	successes: 1,
	failures: 1,
	hunger: 3,
	frenzy: false,
	aggravated: 0,
	stains: 0,
	degeneration: 0,
	dice: [[7]],
	oblivion_faces: [1, 10]
};

test("rouse posts the request to the character's route and returns the result", async () => {
	fetchMock.mockResolvedValueOnce(Response.json(RESULT));
	const request = { count: 2, reroll: true, oblivion_stains: false };

	expect(await rouse('abc', request)).toEqual({ result: RESULT });
	expect(fetchMock).toHaveBeenCalledWith('/api/characters/abc/rouse', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(request)
	});
});

test("rouse returns the API's error", async () => {
	const detail = [{ loc: ['body'], msg: 'Nadia is a mortal.', type: 'value_error' }];
	fetchMock.mockResolvedValueOnce(Response.json({ detail }, { status: 422 }));

	expect(await rouse('abc', { count: 1, reroll: false, oblivion_stains: false })).toEqual({
		error: 'Nadia is a mortal.'
	});
});

test('rouse says when Inconnu is unreachable', async () => {
	fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

	expect(await rouse('abc', { count: 1, reroll: false, oblivion_stains: false })).toEqual({
		error: "Couldn't reach Inconnu to Rouse."
	});
});

test.each([
	[
		422,
		{ detail: [{ loc: ['body', 'count'], msg: 'Input should be less than or equal to 3' }] },
		'Input should be less than or equal to 3'
	],
	[422, { detail: [{ loc: ['body'], msg: 'Value error, Nope.' }] }, 'Nope.'],
	[401, null, 'Your session has ended. Sign in again.'],
	[403, { detail: 'Only the owner' }, "You can't do that for this character."],
	[403, { detail: 'This feature is for supporters only' }, 'This feature is for supporters only.'],
	[404, null, "This character no longer exists, or you're no longer in its server."],
	[503, null, 'Inconnu is starting up. Try again in a moment.'],
	[502, { message: "Couldn't reach Inconnu to Rouse." }, "Couldn't reach Inconnu to Rouse."],
	[500, null, 'Something went wrong. Try again.']
])('a %i is explained', (status, json, expected) => {
	expect(actionError(status, json)).toBe(expected);
});

test("mend posts the request to the character's route and returns the result", async () => {
	const result: MendResult = {
		track: '.....x',
		dice: [7],
		hunger: 2,
		frenzy: false,
		torpor: false
	};
	fetchMock.mockResolvedValueOnce(Response.json(result));
	const request = { type: 'superficial', track: 'health' } as const;

	expect(await mend('abc', request)).toEqual({ result });
	expect(fetchMock).toHaveBeenCalledWith('/api/characters/abc/mend', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(request)
	});
});

test('mend says when Inconnu is unreachable', async () => {
	fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

	expect(await mend('abc', { type: 'aggravated', track: 'health' })).toEqual({
		error: "Couldn't reach Inconnu to mend."
	});
});

test("damage posts the request to the character's route, and a 204 is success", async () => {
	fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
	const request = { track: 'health', superficial: 2, aggravated: 1 } as const;

	expect(await damage('abc', request)).toEqual({ result: null });
	expect(fetchMock).toHaveBeenCalledWith('/api/characters/abc/damage', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(request)
	});
});

test("damage returns the API's error", async () => {
	const detail = [
		{ loc: ['body'], msg: 'Value error, Deal at least one damage.', type: 'value_error' }
	];
	fetchMock.mockResolvedValueOnce(Response.json({ detail }, { status: 422 }));

	expect(await damage('abc', { track: 'health', superficial: 0, aggravated: 0 })).toEqual({
		error: 'Deal at least one damage.'
	});
});

test("slake posts the amount to the character's route and returns whether to test for frenzy", async () => {
	fetchMock.mockResolvedValueOnce(Response.json({ frenzy: true }));

	expect(await slake('abc', { amount: 2 })).toEqual({ result: { frenzy: true } });
	expect(fetchMock).toHaveBeenCalledWith('/api/characters/abc/slake', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ amount: 2 })
	});
});

test.each([['stain', stain]] as const)(
	"%s posts the amount to the character's route, and a 204 is success",
	async (route, action) => {
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

		expect(await action('abc', { amount: 2 })).toEqual({ result: null });
		expect(fetchMock).toHaveBeenCalledWith(`/api/characters/abc/${route}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ amount: 2 })
		});
	}
);

test("remorse posts the options to the character's route and returns the result", async () => {
	const result = { remorseful: true, dice: [2, 7], humanity: 7 };
	fetchMock.mockResolvedValueOnce(Response.json(result));
	const request = { min_override: 1, lasombra_alt: true };

	expect(await remorse('abc', request)).toEqual({ result });
	expect(fetchMock).toHaveBeenCalledWith('/api/characters/abc/remorse', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(request)
	});
});

test('remorse says when Inconnu is unreachable', async () => {
	fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

	expect(await remorse('abc', { min_override: 1, lasombra_alt: false })).toEqual({
		error: "Couldn't reach Inconnu to test Remorse."
	});
});

test('the API refusing a non-supporter opens the upsell, and says why', async () => {
	fetchMock.mockResolvedValueOnce(
		Response.json({ detail: 'This feature is for supporters only' }, { status: 403 })
	);

	const outcome = await stain('abc', { amount: 1 });

	expect(outcome).toEqual({ error: 'This feature is for supporters only.' });
	expect(upsell).toEqual({ open: true, feature: 'Using gameplay actions' });
});

test("other refusals don't open the upsell", async () => {
	fetchMock.mockResolvedValueOnce(Response.json({ detail: 'Only the owner' }, { status: 403 }));

	await stain('abc', { amount: 1 });

	expect(upsell.open).toBe(false);
});

test('a DELETE sends no body', async () => {
	fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

	expect(await postAction('/api/thing', undefined, 'Unreachable.', { method: 'DELETE' })).toEqual({
		result: null
	});
	expect(fetchMock).toHaveBeenCalledWith('/api/thing', { method: 'DELETE' });
});

test('an answer `succeeds` accepts is a success, with no result', async () => {
	const succeeds = (status: number) => status === 404;
	fetchMock
		.mockResolvedValueOnce(Response.json({ detail: 'Gone' }, { status: 404 }))
		.mockResolvedValueOnce(Response.json({ detail: 'Nope' }, { status: 409 }));

	expect(await postAction('/api/thing', {}, 'Unreachable.', { succeeds })).toEqual({
		result: null
	});
	expect(await postAction('/api/thing', {}, 'Unreachable.', { succeeds })).toEqual({
		error: 'Nope'
	});
});
