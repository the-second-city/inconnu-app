import { json } from '@sveltejs/kit';

/** How a route names itself in logs, and what it tells the browser when the API can't answer. */
export interface RelayOptions {
	label: string; // Starts the server's log lines, e.g. "Wizard"
	unavailable: string; // The 502's message, e.g. "The character wizard is unavailable right now."
}

/**
 * Call the Inconnu API and relay its status and JSON body to the browser.
 *
 * The response is rebuilt rather than passed through, so the API's own headers never reach the
 * browser. These are 502s, with the route's `unavailable` message:
 * - a failed or interrupted request
 * - a body that isn't JSON (say, a proxy's HTML error page)
 * - the API's 401, which means it refused our API key: an outage, not something the viewer (or
 *   signing in again) could fix
 */
export const relay = async (
	url: string,
	init: RequestInit,
	{ label, unavailable }: RelayOptions
): Promise<Response> => {
	try {
		const upstream = await fetch(url, init);
		const body = await upstream.text();
		const headers = { 'Cache-Control': 'no-store' };

		if (upstream.status === 401) {
			console.error(`${label}: the Inconnu API refused the API key`);
			return json({ message: unavailable }, { status: 502 });
		}

		// Statuses like 204 can't carry a body
		if (!body) {
			return new Response(null, { status: upstream.status, headers });
		}
		return json(JSON.parse(body), { status: upstream.status, headers });
	} catch (err) {
		console.error(`${label}: bad response from the Inconnu API;`, err);
		return json({ message: unavailable }, { status: 502 });
	}
};
