import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { relay } from '$lib/server/relay';

/**
 * Add Stains: relays `{ amount }` to the Inconnu API's `POST /characters/{id}/stain`, which adds them
 * as `/stain` does (up to 10; overflowing Humanity deals Aggravated Willpower damage), logs it,
 * posts it to the update channel, and answers 204. The API checks that the viewer may stain the
 * character. See `relay` for what becomes a 502. Only a viewer without a session gets a 401.
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ message: 'Sign in to add Stains.' }, { status: 401 });
	}

	const payload = await request.json().catch(() => error(400, 'Invalid JSON'));
	return relay(
		`${INCONNU_API_URL}/characters/${encodeURIComponent(params.id)}/stain`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${API_KEY}`,
				'X-Discord-User-ID': session.user.id
			},
			body: JSON.stringify(payload)
		},
		{ label: 'Stain', unavailable: "Couldn't reach Inconnu to add Stains." }
	);
};
