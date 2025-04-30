import type { PageLoad } from './$types';
import type { UserCharacters } from '$lib/types';

export const load: PageLoad = async ({ fetch }) => {
	const response = await fetch('/api');
	const userCharacters: UserCharacters = await response.json();

	return {
		guilds: userCharacters.guilds,
		characters: userCharacters.characters
	};
};
