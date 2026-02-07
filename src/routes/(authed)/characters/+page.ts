import type { PageLoad } from './$types';
import type { AuthorizedUserChars } from '$lib/types';

export const load: PageLoad = async ({ fetch }) => {
	const response = await fetch('/api');
	const userCharacters: AuthorizedUserChars = await response.json();

	return {
		guilds: userCharacters.guilds,
		characters: userCharacters.characters
	};
};
