import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { relay } from '$lib/server/relay';

/**
 * Deal damage: relays `{ track, superficial, aggravated }` to the Inconnu API's
 * `POST /characters/{id}/damage`, which applies the Superficial, then the Aggravated, damage (as
 * the app's preview does), logs it, posts it to the update channel, and answers 204. The API checks
 * that the viewer may damage the character. See `relay` for what becomes a 502. Only a viewer
 * without a session gets a 401.
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ message: 'Sign in to deal damage.' }, { status: 401 });
	}

	const payload = await request.json().catch(() => error(400, 'Invalid JSON'));
	return relay(
		`${INCONNU_API_URL}/characters/${encodeURIComponent(params.id)}/damage`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${API_KEY}`,
				'X-Discord-User-ID': session.user.id
			},
			body: JSON.stringify(payload)
		},
		{ label: 'Damage', unavailable: "Couldn't reach Inconnu to deal damage." }
	);
};
