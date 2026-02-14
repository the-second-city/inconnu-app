import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { AuthorizedUserChars } from '$lib/types';
import { stripLeadingArticles } from '$lib';

export const load: PageLoad = async ({ fetch }) => {
	const response = await fetch('/api');

	if (!response.ok) {
		error(response.status, 'Failed to load characters');
	}

	const userCharacters: AuthorizedUserChars = await response.json();

	// Sort guilds alphabetically, ignoring leading articles
	const sortedGuilds = userCharacters.guilds.sort((a, b) => {
		const aName = stripLeadingArticles(a.name);
		const bName = stripLeadingArticles(b.name);
		return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
	});

	return {
		guilds: sortedGuilds,
		characters: userCharacters.characters
	};
};
