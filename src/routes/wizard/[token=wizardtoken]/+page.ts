import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Trait, Guild, TrackType } from '$lib/types';

/** The fewest and most boxes a track may have. */
export interface TrackLimits {
	min: number;
	max: number;
}

interface WizardData {
	spc: boolean;
	guild: Guild;
	splats: string[];
	limits?: Record<TrackType, TrackLimits>; // The bot's Health and Willpower limits
	traits: Trait[];
}

/** The bot's limits when this was written, should it not send them (an older bot, say). */
const DEFAULT_LIMITS: Record<TrackType, TrackLimits> = {
	health: { min: 4, max: 20 },
	willpower: { min: 3, max: 20 }
};

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
			limits: data.limits ?? DEFAULT_LIMITS,
			traits: data.traits
		};
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		error(500, 'Failed to load wizard');
	}
};
