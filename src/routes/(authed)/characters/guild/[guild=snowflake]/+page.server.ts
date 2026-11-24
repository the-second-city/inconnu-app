import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { fetchApi } from '$lib/server/api';
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

	const response = await fetchApi(
		`${INCONNU_API_URL}/characters/guild/${encodeURIComponent(guild)}`,
		{
			headers: {
				Authorization: `Bearer ${API_KEY}`,
				'X-Discord-User-ID': discordUserId
			}
		},
		{
			failure: {
				label: 'Guild characters',
				unavailable: "This server's characters are unavailable right now."
			}
		}
	);

	if (!response.ok) {
		if (response.status === 404) {
			error(404, 'Guild not found');
		}
		error(response.status, 'Failed to load guild characters');
	}

	const data: GuildChars = await response.json();
	return { guild: data.guild, characters: data.characters };
};
