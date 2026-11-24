import { isHttpError } from '@sveltejs/kit';
import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';

import { API_TIMEOUT_MS, fetchApi } from './api';

let fetchMock: Mock<typeof fetch>;

/** A fetch that never answers, as a hung API, until its signal aborts it. */
const hang = (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
	new Promise((_, reject) => {
		init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
	});

/** A fetch that answers at once, then stalls partway through the body until its signal aborts. */
const stallBody = async (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
	const signal = init?.signal as AbortSignal;
	return new Response(
		new ReadableStream({
			start: (controller) => {
				controller.enqueue(new TextEncoder().encode('{"partial":'));
				signal.addEventListener('abort', () => controller.error(signal.reason));
			}
		})
	);
};

const FAILURE = { label: 'Test', unavailable: 'The test page is unavailable right now.' };

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

/** Whether a promise has settled, without waiting for it. */
const settled = (promise: Promise<unknown>): (() => boolean) => {
	let done = false;
	promise.then(
		() => (done = true),
		() => (done = true)
	);
	return () => done;
};

test('passes the request through, with a signal for the timeout', async () => {
	const answer = new Response('{}');
	fetchMock.mockResolvedValueOnce(answer);

	const response = await fetchApi('http://api/x', { headers: { Authorization: 'Bearer k' } });

	expect(response).toBe(answer);
	expect(fetchMock).toHaveBeenCalledWith('http://api/x', {
		headers: { Authorization: 'Bearer k' },
		signal: expect.any(AbortSignal)
	});
});

test('gives up on an API that hasn’t answered in time, and not before', async () => {
	fetchMock.mockImplementationOnce(hang);
	const request = fetchApi('http://api/x');
	const done = settled(request);

	await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS - 1);
	expect(done()).toBe(false);
	await vi.advanceTimersByTimeAsync(1);

	await expect(request).rejects.toMatchObject({ name: 'TimeoutError' });
});

test('by default, times reading the body too', async () => {
	fetchMock.mockImplementationOnce(stallBody);
	const response = await fetchApi('http://api/x');
	const body = response.json();
	const failed = expect(body).rejects.toMatchObject({ name: 'TimeoutError' });

	await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS);

	await failed;
});

test('timing only the response leaves the body to stream as long as it takes', async () => {
	fetchMock.mockImplementationOnce(stallBody);
	const response = await fetchApi('http://api/x', {}, { timeout: 'response' });
	const done = settled(response.text());

	await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS * 2);

	expect(done()).toBe(false);
});

test('untimed, it waits however long the API takes', async () => {
	fetchMock.mockImplementationOnce(hang);
	const done = settled(fetchApi('http://api/x', { method: 'POST' }, { timeout: false }));

	await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS * 6);

	expect(done()).toBe(false);
});

test("the caller's own signal still aborts it", async () => {
	fetchMock.mockImplementationOnce(hang);
	const leaving = new AbortController();
	const request = fetchApi('http://api/x', { signal: leaving.signal });
	const failed = expect(request).rejects.toBe('left');

	leaving.abort('left');

	await failed;
});

test.each([
	['an unreachable API', () => Promise.reject(new TypeError('fetch failed'))],
	['a hung one', hang]
])('with a failure message, %s is a 502 that says so', async (_, impl) => {
	fetchMock.mockImplementationOnce(impl);

	const request = fetchApi('http://api/x', {}, { failure: FAILURE });
	const caught = request.catch((err: unknown) => err);
	await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS);
	const err = await caught;

	expect(isHttpError(err) && err.status).toBe(502);
	expect(isHttpError(err) && err.body.message).toBe(FAILURE.unavailable);
	expect(console.error).toHaveBeenCalledWith(
		'Test: no answer from the Inconnu API;',
		expect.anything()
	);
});

test('without one, the error is thrown as is', async () => {
	const failure = new TypeError('fetch failed');
	fetchMock.mockRejectedValueOnce(failure);

	await expect(fetchApi('http://api/x')).rejects.toBe(failure);
});
