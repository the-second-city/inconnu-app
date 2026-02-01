import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { session } = await parent();

	if (!session?.user?.id) {
		error(401, 'Authentication required');
	}

	const discordUserId = session.user.id;

	try {
		const response = await fetch(`${INCONNU_API_URL}/characters/${params.id}`, {
			headers: {
				Authorization: `Bearer ${API_KEY}`,
				'X-Discord-User-ID': discordUserId
			}
		});

		if (!response.ok) {
			error(response.status, 'Character not found or access denied');
		}

		const data = await response.json();
		return {
			guild: data.guild,
			character: data.character
		};
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		error(500, 'Failed to load character');
	}
};
