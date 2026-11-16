import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { relay } from '$lib/server/relay';

/**
 * Save edit mode's changes to a character: relays the edit to the Inconnu API's
 * `PATCH /characters/{id}`, which checks that the viewer may edit it (owner or Storyteller).
 *
 * The API answers 204 on success, and a status with a JSON body otherwise (a 422's `detail` lists
 * each invalid field). See `relay` for what becomes a 502. Only a viewer without a session gets a
 * 401.
 */
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ message: 'Sign in to save changes.' }, { status: 401 });
	}

	const payload = await request.json().catch(() => error(400, 'Invalid JSON'));
	return relay(
		`${INCONNU_API_URL}/characters/${encodeURIComponent(params.id)}`,
		{
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${API_KEY}`,
				'X-Discord-User-ID': session.user.id
			},
			body: JSON.stringify(payload)
		},
		{ label: 'Edit', unavailable: "Couldn't reach Inconnu to save your changes." }
	);
};
