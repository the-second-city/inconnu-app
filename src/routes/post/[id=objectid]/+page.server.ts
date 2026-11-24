import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { fetchApi } from '$lib/server/api';
import { getErrorDetail } from '$lib';
import type { Changelog } from '$lib/types';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	if (!id) {
		error(400, 'Post ID is required');
	}

	const response = await fetchApi(
		`${INCONNU_API_URL}/changelog/${encodeURIComponent(id)}`,
		{
			headers: {
				Authorization: `Bearer ${API_KEY}`
			}
		},
		{ failure: { label: 'Changelog', unavailable: 'This changelog is unavailable right now.' } }
	);

	if (!response.ok) {
		error(response.status, await getErrorDetail(response, 'Failed to load rolepost changelog'));
	}

	const changelog: Changelog = await response.json();
	return { changelog };
};
