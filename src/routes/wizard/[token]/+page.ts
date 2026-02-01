import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Trait, Guild } from '$lib/types';

interface WizardData {
	spc: boolean;
	guild: Pick<Guild, 'name' | 'icon'>;
	splats: string[];
	traits: Trait[];
}

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

		const data: WizardData = await response.json();

		return {
			token,
			spc: data.spc,
			guild: data.guild,
			splats: data.splats,
			traits: data.traits
		};
	} catch (err) {
		error(500, 'Failed to load wizard');
	}
};
