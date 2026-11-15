import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import type { CharacterData } from '$lib/types';
import { CHARACTER_DEPENDENCY } from '$lib/liveUpdates';

export const load: PageServerLoad = async ({ depends, params, parent }) => {
	// Live updates rerun this when the character changes
	depends(CHARACTER_DEPENDENCY);

	const { session } = await parent();

	if (!session?.user?.id) {
		error(401, 'Authentication required');
	}

	const discordUserId = session.user.id;

	const response = await fetch(`${INCONNU_API_URL}/characters/${encodeURIComponent(params.id)}`, {
		headers: {
			Authorization: `Bearer ${API_KEY}`,
			'X-Discord-User-ID': discordUserId
		}
	});

	if (!response.ok) {
		error(response.status, 'Character not found or access denied');
	}

	const characterData: CharacterData = await response.json();
	return { characterData };
};
