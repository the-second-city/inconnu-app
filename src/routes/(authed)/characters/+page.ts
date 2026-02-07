import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { AuthorizedUserChars } from '$lib/types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const response = await fetch('/api');

		if (!response.ok) {
			error(response.status, 'Failed to load characters');
		}

		const userCharacters: AuthorizedUserChars = await response.json();

		return {
			guilds: userCharacters.guilds,
			characters: userCharacters.characters
		};
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		error(500, 'Failed to load characters');
	}
};
