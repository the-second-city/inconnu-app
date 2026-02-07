import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import type { GuildChars } from '$lib/types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { session } = await parent();

	if (!session?.user?.id) {
		error(401, 'Authentication required');
	}

	const discordUserId = session.user.id;
	const { guild } = params;

	if (!guild) {
		error(400, 'Guild ID is required');
	}

	try {
		const response = await fetch(`${INCONNU_API_URL}/characters/guild/${guild}`, {
			headers: {
				Authorization: `Bearer ${API_KEY}`,
				'X-Discord-User-ID': discordUserId
			}
		});

		if (!response.ok) {
			if (response.status === 404) {
				error(404, 'Guild not found');
			}
			error(response.status, 'Failed to load guild characters');
		}

		const data: GuildChars = await response.json();
		return { guild: data.guild, characters: data.characters };
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		error(500, 'Failed to load guild characters');
	}
};
