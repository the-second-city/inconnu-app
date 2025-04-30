import { error } from '@sveltejs/kit';
import type { PageLoad } from '../$types';
import type { UserCharacters, Guild } from '$lib/types';

export const load: PageLoad = async ({ fetch, params }) => {
	const response = await fetch('/api');
	const userCharacters: UserCharacters = await response.json();

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
	error(404);
};
