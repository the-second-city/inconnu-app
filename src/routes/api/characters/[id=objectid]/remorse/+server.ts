import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { relay } from '$lib/server/relay';

/**
 * Make a Remorse test: relays `{ min_override, lasombra_alt }` to the Inconnu API's
 * `POST /characters/{id}/remorse`, which rolls it as `/remorse` does (failing costs a Humanity;
 * either way the Stains clear), logs it, posts it to the update channel, and answers with a
 * `RemorseResult`. The API checks that the viewer may test the character (the owner, or a
 * Storyteller for an SPC). See `relay` for what becomes a 502. Only a viewer without a session gets
 * a 401.
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ message: 'Sign in to test Remorse.' }, { status: 401 });
	}

	const payload = await request.json().catch(() => error(400, 'Invalid JSON'));
	return relay(
		`${INCONNU_API_URL}/characters/${encodeURIComponent(params.id)}/remorse`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${API_KEY}`,
				'X-Discord-User-ID': session.user.id
			},
			body: JSON.stringify(payload)
		},
		{ label: 'Remorse', unavailable: "Couldn't reach Inconnu to test Remorse." }
	);
};
