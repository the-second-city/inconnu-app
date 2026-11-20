import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';

import { TEST_CONSTRAINTS } from '$lib/testing/constraints';
import type { Constraints } from '$lib/types';

vi.mock('$env/static/private', () => ({ API_KEY: 'test-key', INCONNU_API_URL: 'http://api' }));

/** A response from the bot's /constraints endpoint. */
const ok = (body: Constraints = TEST_CONSTRAINTS): Response => Response.json(body);

let fetchMock: Mock<typeof fetch>;

/** A fresh copy of the module, since it caches the constraints at module level. */
const loadModule = async (): Promise<typeof import('./constraints')> => {
	vi.resetModules();
	return import('./constraints');
};

beforeEach(() => {
	vi.useFakeTimers();
	fetchMock = vi.fn<typeof fetch>();
	vi.stubGlobal('fetch', fetchMock);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

test('fetches the constraints with the API key', async () => {
	fetchMock.mockResolvedValue(ok());
	const { getConstraints } = await loadModule();

	expect(await getConstraints()).toEqual(TEST_CONSTRAINTS);
	expect(fetchMock).toHaveBeenCalledWith('http://api/constraints', {
		headers: { Authorization: 'Bearer test-key' },
		signal: expect.any(AbortSignal)
	});
});

test('caches the constraints for a few minutes', async () => {
	fetchMock.mockImplementation(async () => ok());
	const { getConstraints } = await loadModule();

	await getConstraints();
	vi.advanceTimersByTime(4 * 60_000);
	await getConstraints();
	expect(fetchMock).toHaveBeenCalledTimes(1);

	vi.advanceTimersByTime(2 * 60_000);
	await getConstraints();
	expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('concurrent calls share one fetch', async () => {
	fetchMock.mockImplementation(async () => ok());
	const { getConstraints } = await loadModule();

	await Promise.all([getConstraints(), getConstraints()]);

	expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('takes new constraints once the cache expires', async () => {
	const changed: Constraints = { ...TEST_CONSTRAINTS, name_max_length: 40 };
	fetchMock.mockResolvedValueOnce(ok()).mockResolvedValueOnce(ok(changed));
	const { getConstraints } = await loadModule();

	await getConstraints();
	vi.advanceTimersByTime(6 * 60_000);

	expect(await getConstraints()).toEqual(changed);
});

test('keeps the last good copy when the API fails', async () => {
	fetchMock.mockResolvedValueOnce(ok()).mockResolvedValueOnce(new Response(null, { status: 503 }));
	const { getConstraints } = await loadModule();

	await getConstraints();
	vi.advanceTimersByTime(6 * 60_000);

	expect(await getConstraints()).toEqual(TEST_CONSTRAINTS);
});

test.each([
	['an error status', async () => new Response(null, { status: 503 })],
	[
		'an unreachable API',
		async () => {
			throw new TypeError('fetch failed');
		}
	]
])('throws on %s with nothing cached', async (_case, answer: () => Promise<Response>) => {
	fetchMock.mockImplementation(answer);
	const { getConstraints } = await loadModule();

	await expect(getConstraints()).rejects.toThrow();
});

test('after a failed refresh, serves the last good copy for a while before trying again', async () => {
	fetchMock
		.mockResolvedValueOnce(ok())
		.mockResolvedValueOnce(new Response(null, { status: 503 }))
		.mockResolvedValue(ok());
	const { getConstraints } = await loadModule();

	await getConstraints();
	vi.advanceTimersByTime(6 * 60_000);
	await getConstraints(); // Fails, keeping the cached copy

	vi.advanceTimersByTime(20_000);
	expect(await getConstraints()).toEqual(TEST_CONSTRAINTS);
	expect(fetchMock).toHaveBeenCalledTimes(2);

	vi.advanceTimersByTime(15_000);
	await getConstraints();
	expect(fetchMock).toHaveBeenCalledTimes(3);
});

test('with nothing cached, each call tries again after a failure', async () => {
	fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 })).mockResolvedValue(ok());
	const { getConstraints } = await loadModule();

	await expect(getConstraints()).rejects.toThrow();

	expect(await getConstraints()).toEqual(TEST_CONSTRAINTS);
});
