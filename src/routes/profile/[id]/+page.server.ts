import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import type { CharacterData } from '$lib/types';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	if (!id) {
		error(400, 'Character ID is required');
	}

	try {
		const response = await fetch(`${INCONNU_API_URL}/characters/profile/${id}`, {
			headers: {
				Authorization: `Bearer ${API_KEY}`
			}
		});

		if (!response.ok) {
			if (response.status === 404) {
				error(404, 'Character profile not found');
			}
			error(response.status, 'Failed to load character profile');
		}

		const characterData: CharacterData = await response.json();
		return { characterData };
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		error(500, 'Failed to load character profile');
	}
};
