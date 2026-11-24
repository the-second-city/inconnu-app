import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { relay } from '$lib/server/relay';

/** The Inconnu API's wizard endpoint for a token. */
const wizardUrl = (token: string): string =>
	`${INCONNU_API_URL}/characters/wizard/${encodeURIComponent(token)}`;

/** How the wizard's relay logs, and what it says when the API can't answer. */
const RELAY = { label: 'Wizard', unavailable: 'The character wizard is unavailable right now.' };

/**
 * Relay the wizard, adding `expires_in`: the milliseconds until `expires_at` by the server's clock.
 * The page counts down from that, since the viewer's clock may be off by minutes.
 */
export const GET: RequestHandler = async ({ params }) => {
	const response = await relay(
		wizardUrl(params.token),
		{ headers: { Authorization: `Bearer ${API_KEY}` } },
		RELAY
	);
	if (response.status !== 200) return response; // Errors, and any answer without the wizard

	const data = await response.json();
	// The relay's headers, but not its Content-Length, which counts the body without `expires_in`
	// (`json()` keeps one it's given, and the browser would get the body cut short)
	const headers = new Headers(response.headers);
	headers.delete('Content-Length');
	const expiresIn = Date.parse(data.expires_at) - Date.now();
	if (isNaN(expiresIn)) return json(data, { headers }); // A bot without it
	return json({ ...data, expires_in: expiresIn }, { headers });
};

export const POST: RequestHandler = async ({ params, request }) => {
	const payload = await request.json().catch(() => error(400, 'Invalid JSON'));

	return relay(
		wizardUrl(params.token),
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${API_KEY}`
			},
			body: JSON.stringify(payload)
		},
		RELAY
	);
};
