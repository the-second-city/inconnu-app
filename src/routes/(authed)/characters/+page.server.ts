import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { AuthorizedUserChars } from '$lib/types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { getErrorDetail, stripLeadingArticles } from '$lib';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();

	if (!session?.user?.id) {
		error(401, 'Authentication required');
	}

	const response = await fetch(`${INCONNU_API_URL}/characters`, {
		headers: {
			Authorization: `Bearer ${API_KEY}`,
			'X-Discord-User-ID': session.user.id
		}
	});

	if (!response.ok) {
		error(response.status, await getErrorDetail(response, 'Failed to load characters'));
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
