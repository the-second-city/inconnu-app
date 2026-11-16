import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { relay } from '$lib/server/relay';

/**
 * Heal damage: relays `{ type: "superficial" | "aggravated", track: "health" }` to the Inconnu API's
 * `POST /characters/{id}/mend`, which heals as `/mend` and `/aggheal` do (vampires Rouse for it;
 * the checks are logged and posted to the update channel) and answers with a `MendResult`. The API
 * checks that the viewer may heal the character. See `relay` for what becomes a 502. Only a viewer
 * without a session gets a 401.
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ message: 'Sign in to mend.' }, { status: 401 });
	}

	const payload = await request.json().catch(() => error(400, 'Invalid JSON'));
	return relay(
		`${INCONNU_API_URL}/characters/${encodeURIComponent(params.id)}/mend`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${API_KEY}`,
				'X-Discord-User-ID': session.user.id
			},
			body: JSON.stringify(payload)
		},
		{ label: 'Mend', unavailable: "Couldn't reach Inconnu to mend." }
	);
};
