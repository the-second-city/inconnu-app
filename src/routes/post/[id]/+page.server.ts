import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import type { Changelog } from '$lib/types';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	if (!id) {
		error(400, 'Post ID is required');
	}

	const response = await fetch(`${INCONNU_API_URL}/changelog/${id}`, {
		headers: {
			Authorization: `Bearer ${API_KEY}`
		}
	});

	if (!response.ok) {
		const data = await response.json().catch(() => null);
		const detail = data?.detail;

		if (response.status === 404) {
			error(404, detail ?? 'Rolepost not found');
		}
		if (response.status === 410) {
			error(410, detail ?? 'This post is no longer available');
		}
		error(response.status, detail ?? 'Failed to load rolepost changelog');
	}

	const changelog: Changelog = await response.json();
	return { changelog };
};
