import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';

/** Why a save couldn't reach the API, or the API couldn't answer properly. */
const UNAVAILABLE = "Couldn't reach Inconnu to save your changes.";

/**
 * Save edit mode's changes to a character: relays the edit to the Inconnu API's
 * `PATCH /characters/{id}`, which checks that the viewer may edit it (owner or Storyteller).
 *
 * The API answers 204 on success, and a status with a JSON body otherwise (a 422's `detail` lists
 * each invalid field). The response is rebuilt rather than passed through, so the API's own
 * headers never reach the browser. A failed request, a body that isn't JSON (say, a proxy's
 * HTML error page), or the API refusing our API key (its 401) is a 502. Only a viewer without a
 * session gets a 401.
 */
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ message: 'Sign in to save changes.' }, { status: 401 });
	}

	const payload = await request.json().catch(() => error(400, 'Invalid JSON'));
	const headers = { 'Cache-Control': 'no-store' };

	try {
		const upstream = await fetch(`${INCONNU_API_URL}/characters/${encodeURIComponent(params.id)}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${API_KEY}`,
				'X-Discord-User-ID': session.user.id
			},
			body: JSON.stringify(payload)
		});
		const body = await upstream.text();

		// The API's 401 means our API key was refused, not the viewer's session: that's an outage,
		// not something signing in again would fix
		if (upstream.status === 401) {
			console.error('Edit: the Inconnu API refused the API key');
			return json({ message: UNAVAILABLE }, { status: 502 });
		}

		// 204 (and any other empty answer) can't carry a body
		if (!body) {
			return new Response(null, { status: upstream.status, headers });
		}
		return json(JSON.parse(body), { status: upstream.status, headers });
	} catch (err) {
		console.error('Edit: bad response from the Inconnu API;', err);
		return json({ message: UNAVAILABLE }, { status: 502 });
	}
};
