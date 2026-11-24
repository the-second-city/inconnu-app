import { afterEach, beforeEach, expect, test, vi, type Mock } from 'vitest';

import { API_TIMEOUT_MS } from './api';
import { relay } from './relay';

let fetchMock: Mock<typeof fetch>;

const OPTIONS = { label: 'Test', unavailable: 'The test is unavailable right now.' };

/** A fetch that never answers, as a slow bot, until its signal aborts it. */
const hang = (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
	new Promise((_, reject) => {
		init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
	});

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

test('a GET the API takes too long to answer is a 502', async () => {
	fetchMock.mockImplementationOnce(hang);

	const response = relay('http://api/x', {}, OPTIONS);
	await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS);

	expect((await response).status).toBe(502);
});

test.each(['POST', 'PATCH'])(
	'a %s waits however long the bot takes, since it may still apply it',
	async (method) => {
		let answer: (response: Response) => void = () => {};
		// A slow bot, which a timeout would abort, as a real fetch does
		fetchMock.mockImplementationOnce(
			(_url, init) =>
				new Promise((resolve, reject) => {
					answer = resolve;
					init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
				})
		);

		const response = relay('http://api/x', { method }, OPTIONS);
		await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS * 3);
		answer(new Response(null, { status: 204 }));

		expect((await response).status).toBe(204);
	}
);
