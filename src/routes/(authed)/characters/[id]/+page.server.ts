import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { UserCharacters, Guild } from '$lib/types';
import { API_KEY } from '$env/static/private';
import charData from '$lib/data/chardata.json';

const INCONNU_API_URL = 'https://inconnu.app';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { session } = await parent();

	if (!session?.user?.id) {
		error(401, 'Authentication required');
	}

	const discordUserId = session.user.id;

	// For now, return sample data
	const userCharacters: UserCharacters = charData;

	for (const character of userCharacters.characters) {
		let characterGuild: Guild | null = null;
		if (character._id === params.id) {
			// Find the guild
			for (const guild of userCharacters.guilds) {
				if (guild.id === character.guild) {
					characterGuild = guild;
					break;
				}
			}
			return {
				guild: characterGuild,
				character
			};
		}
	}

	// TODO: Uncomment when ready to use real API
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
