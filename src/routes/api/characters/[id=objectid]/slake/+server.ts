import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { relay } from '$lib/server/relay';

/**
 * Slake Hunger: relays `{ amount }` to the Inconnu API's `POST /characters/{id}/slake`, which slakes
 * as `/slake` does (down to 0), logs it, posts it to the update channel, and answers with a
 * `SlakeResult` (whether to test for frenzy). The API
 * checks that the viewer may slake the character (the owner, or a Storyteller for an SPC). See
 * `relay` for what becomes a 502. Only a viewer without a session gets a 401.
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ message: 'Sign in to slake.' }, { status: 401 });
	}

	const payload = await request.json().catch(() => error(400, 'Invalid JSON'));
	return relay(
		`${INCONNU_API_URL}/characters/${encodeURIComponent(params.id)}/slake`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${API_KEY}`,
				'X-Discord-User-ID': session.user.id
			},
			body: JSON.stringify(payload)
		},
		{ label: 'Slake', unavailable: "Couldn't reach Inconnu to slake." }
	);
};
