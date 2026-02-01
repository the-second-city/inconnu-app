import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Trait } from '$lib/types';

export const load: PageLoad = async ({ params, fetch }) => {
	const { token } = params;

	try {
		const response = await fetch(`/api/wizard/${token}`);

		if (!response.ok) {
			if (response.status === 404) {
				error(404, 'Wizard session not found or expired');
			}
			error(response.status, 'Failed to load wizard data');
		}

		const traits: Trait[] = await response.json();

		return {
			traits,
			title: 'Create a Character'
		};
	} catch (err) {
		error(500, 'Failed to load wizard');
	}
};
