import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { fetchApi } from '$lib/server/api';
import type { CharacterData } from '$lib/types';
import { CHARACTER_DEPENDENCY } from '$lib/api/liveUpdates';
import { getConstraints } from '$lib/server/constraints';

export const load: PageServerLoad = async ({ depends, params, parent }) => {
	// Live updates rerun this when the character changes
	depends(CHARACTER_DEPENDENCY);

	const { session } = await parent();

	if (!session?.user?.id) {
		error(401, 'Authentication required');
	}

	const discordUserId = session.user.id;

	const response = await fetchApi(
		`${INCONNU_API_URL}/characters/${encodeURIComponent(params.id)}`,
		{
			headers: {
				Authorization: `Bearer ${API_KEY}`,
				'X-Discord-User-ID': discordUserId
			}
		},
		{
			failure: {
				label: 'Character page',
				unavailable: 'The character page is unavailable right now.'
			}
		}
	);

	if (!response.ok) {
		error(response.status, 'Character not found or access denied');
	}

	const characterData: CharacterData = await response.json();

	// Full access (the owner or a Storyteller) may edit, which checks input against the bot's rules
	if (characterData.type !== 'full') return { characterData, constraints: null };
	try {
		return { characterData, constraints: await getConstraints() };
	} catch (err) {
		console.error('Character page: no constraints from the Inconnu API;', err);
		error(502, 'The character page is unavailable right now.');
	}
};
