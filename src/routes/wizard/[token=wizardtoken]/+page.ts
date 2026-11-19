import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { TRACK_LIMITS, type TrackLimits } from '$lib/rules/damage';
import type { Trait, Guild, TrackType } from '$lib/types';

interface WizardData {
	spc: boolean;
	guild: Guild;
	splats: string[];
	limits?: Record<TrackType, TrackLimits>; // The bot's Health and Willpower limits
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
			limits: data.limits ?? TRACK_LIMITS, // Should the bot not send them (an older bot, say)
			traits: data.traits
		};
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		error(500, 'Failed to load wizard');
	}
};
