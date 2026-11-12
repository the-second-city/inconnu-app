import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';

/** The Inconnu API's wizard endpoint for a token. */
const wizardUrl = (token: string): string =>
	`${INCONNU_API_URL}/characters/wizard/${encodeURIComponent(token)}`;

/**
 * Call the Inconnu API and relay its status and JSON body.
 *
 * The response is rebuilt rather than passed through, so the API's own headers
 * never reach the browser. Anything that isn't JSON, such as a proxy's HTML
 * error page, is reported as a 502, as is a failed or interrupted request.
 */
const relay = async (url: string, init: RequestInit): Promise<Response> => {
	try {
		const upstream = await fetch(url, init);
		const body = await upstream.text();
		const headers = { 'Cache-Control': 'no-store' };

		// Statuses like 204 can't carry a body
		if (!body) {
			return new Response(null, { status: upstream.status, headers });
		}
		return json(JSON.parse(body), { status: upstream.status, headers });
	} catch (err) {
		console.error('Wizard: bad response from the Inconnu API;', err);
		return json({ message: 'The character wizard is unavailable right now.' }, { status: 502 });
	}
};

export const GET: RequestHandler = async ({ params }) =>
	relay(wizardUrl(params.token), { headers: { Authorization: `Bearer ${API_KEY}` } });

export const POST: RequestHandler = async ({ params, request }) => {
	const payload = await request.json().catch(() => error(400, 'Invalid JSON'));

	return relay(wizardUrl(params.token), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${API_KEY}`
		},
		body: JSON.stringify(payload)
	});
};
