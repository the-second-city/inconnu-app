import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { relay } from '$lib/server/relay';

/**
 * Whether the signed-in viewer is a supporter: relays the Inconnu API's `GET /users/check-premium`,
 * which answers `{ is_supporter }`. Editing and the tracker actions are for supporters, so the
 * character page asks before starting them. Only a viewer without a session gets a 401.
 */
export const GET: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ message: 'Sign in to check your supporter status.' }, { status: 401 });
	}

	return relay(
		`${INCONNU_API_URL}/users/check-premium`,
		{
			headers: {
				Authorization: `Bearer ${API_KEY}`,
				'X-Discord-User-ID': session.user.id
			}
		},
		{
			label: 'Premium check',
			unavailable: "Couldn't reach Inconnu to check your supporter status."
		}
	);
};
