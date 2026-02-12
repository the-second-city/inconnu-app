import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { AuthorizedUserChars } from '$lib/types';

export const load: PageLoad = async ({ fetch }) => {
	const response = await fetch('/api');

	if (!response.ok) {
		error(response.status, 'Failed to load characters');
	}

	const userCharacters: AuthorizedUserChars = await response.json();

	return {
		guilds: userCharacters.guilds,
		characters: userCharacters.characters
	};
};
