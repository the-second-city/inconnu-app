import type { RequestHandler } from './$types';
import { characterRelay } from '$lib/server/characterRelay';

/**
 * Make Rouse checks: relays `{ count, reroll, oblivion_stains }` to the Inconnu API's
 * `POST /characters/{id}/rouse`, which rolls them as `/rouse` does (Hunger rises on failures, and
 * the checks are logged and posted to the update channel) and answers with a `RouseResult`. The
 * API checks that the viewer may Rouse the character.
 */
export const POST: RequestHandler = characterRelay({
	method: 'POST',
	action: 'rouse',
	signIn: 'Sign in to Rouse.',
	label: 'Rouse',
	unavailable: "Couldn't reach Inconnu to Rouse."
});
