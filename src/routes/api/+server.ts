import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';

export const GET: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();

	if (!session?.user?.id) {
		error(401, 'Authentication required');
	}

	const discordUserId = session.user.id;

	try {
		const response = await fetch(`${INCONNU_API_URL}/characters`, {
			headers: {
				Authorization: `Bearer ${API_KEY}`,
				'X-Discord-User-ID': discordUserId
			}
		});

		if (!response.ok) {
			error(response.status, 'Failed to fetch characters');
		}

		const data = await response.json();
		return json(data);
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		error(500, 'Failed to load characters');
	}
};
