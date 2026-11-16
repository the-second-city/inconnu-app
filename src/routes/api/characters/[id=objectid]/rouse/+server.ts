import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { relay } from '$lib/server/relay';

/**
 * Make Rouse checks: relays `{ count, reroll, oblivion_stains }` to the Inconnu API's
 * `POST /characters/{id}/rouse`, which rolls them as `/rouse` does (Hunger rises on failures, and
 * the checks are logged and posted to the update channel) and answers with a `RouseResult`. The
 * API checks that the viewer may Rouse the character. See `relay` for what becomes a 502. Only a
 * viewer without a session gets a 401.
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ message: 'Sign in to Rouse.' }, { status: 401 });
	}

	const payload = await request.json().catch(() => error(400, 'Invalid JSON'));
	return relay(
		`${INCONNU_API_URL}/characters/${encodeURIComponent(params.id)}/rouse`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${API_KEY}`,
				'X-Discord-User-ID': session.user.id
			},
			body: JSON.stringify(payload)
		},
		{ label: 'Rouse', unavailable: "Couldn't reach Inconnu to Rouse." }
	);
};
