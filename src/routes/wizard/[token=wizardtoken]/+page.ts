import { error, isHttpError } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Constraints, Trait, Guild } from '$lib/types';

interface WizardData {
	spc: boolean;
	guild: Guild;
	splats: string[];
	constraints: Constraints; // What the bot accepts, which the form checks against
	traits: Trait[];
	expires_in?: number; // Milliseconds until the link expires, by the server's clock
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
			constraints: data.constraints,
			traits: data.traits,
			expiresIn: data.expires_in ?? null
		};
	} catch (err) {
		// SvelteKit's error() throws an HttpError, which isn't an Error: let it through
		if (isHttpError(err)) throw err;
		error(500, 'Failed to load wizard');
	}
};
