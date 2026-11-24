import { error } from '@sveltejs/kit';

/** How long a timed request to the Inconnu API may take before it gives up. */
export const API_TIMEOUT_MS = 10_000;

/** How a route names itself in logs, and what it tells the browser when the API can't answer. */
export interface ApiFailure {
	label: string; // Starts the server's log lines, e.g. "Wizard"
	unavailable: string; // The 502's message, e.g. "The character wizard is unavailable right now."
}

export interface FetchApiOptions {
	/** With it, a failed or timed-out request is logged and thrown as a 502 saying `unavailable`,
	 * which a page loader shows (otherwise it would be a bare 500). Without it, the error is thrown
	 * as is. */
	failure?: ApiFailure;
	/**
	 * What `API_TIMEOUT_MS` covers:
	 * - `request` (the default): the whole request, reading the body too, so a hung API can't
	 *   hold up a page
	 * - `response`: only the wait for it to start answering, for a body streamed on to the browser
	 *   (a docs image may still be streaming to a slow one)
	 * - `false`: none, for a call that changes something. Giving up on one the bot is still working
	 *   through would report a failure it then applies anyway, and a retry would apply it twice
	 */
	timeout?: 'request' | 'response' | false;
}

/** `fetch` from the Inconnu API, giving up on one that takes too long (see `FetchApiOptions`). */
export const fetchApi = async (
	url: string,
	init: RequestInit = {},
	{ failure, timeout = 'request' }: FetchApiOptions = {}
): Promise<Response> => {
	const controller = new AbortController();
	// For `request`, it runs on while the caller reads the body; once that's read, aborting does
	// nothing. For `response`, it stops once the API answers
	const timer =
		timeout === false
			? undefined
			: setTimeout(
					() => controller.abort(new DOMException('The Inconnu API took too long', 'TimeoutError')),
					API_TIMEOUT_MS
				);
	// The caller's own signal (say, the browser leaving) still aborts it
	const signal = init.signal
		? AbortSignal.any([init.signal, controller.signal])
		: controller.signal;
	try {
		return await fetch(url, { ...init, signal });
	} catch (err) {
		clearTimeout(timer);
		if (!failure) throw err;
		console.error(`${failure.label}: no answer from the Inconnu API;`, err);
		error(502, failure.unavailable);
	} finally {
		if (timeout === 'response') clearTimeout(timer);
	}
};
