import type { RequestHandler } from './$types';
import { characterRelay } from '$lib/server/characterRelay';

/**
 * Add Stains: relays `{ amount }` to the Inconnu API's `POST /characters/{id}/stain`, which adds them
 * as `/stain` does (up to 10; overflowing Humanity deals Aggravated Willpower damage), logs it,
 * posts it to the update channel, and answers 204. The API checks that the viewer may stain the
 * character.
 */
export const POST: RequestHandler = characterRelay({
	method: 'POST',
	action: 'stain',
	signIn: 'Sign in to add Stains.',
	label: 'Stain',
	unavailable: "Couldn't reach Inconnu to add Stains."
});
