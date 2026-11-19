import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { relay } from '$lib/server/relay';

/** The Inconnu API's wizard endpoint for a token. */
const wizardUrl = (token: string): string =>
	`${INCONNU_API_URL}/characters/wizard/${encodeURIComponent(token)}`;

/** How the wizard's relay logs, and what it says when the API can't answer. */
const RELAY = { label: 'Wizard', unavailable: 'The character wizard is unavailable right now.' };

export const GET: RequestHandler = async ({ params }) =>
	relay(wizardUrl(params.token), { headers: { Authorization: `Bearer ${API_KEY}` } }, RELAY);

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
