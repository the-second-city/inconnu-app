import type { RequestHandler } from './$types';
import { characterRelay } from '$lib/server/characterRelay';

/**
 * Heal damage: relays `{ type: "superficial" | "aggravated", track: "health" | "willpower" }` to the Inconnu API's
 * `POST /characters/{id}/mend`, which heals as `/mend` and `/aggheal` do (vampires Rouse to heal Health;
 * the checks are logged and posted to the update channel) and answers with a `MendResult`. The API
 * checks that the viewer may heal the character.
 */
export const POST: RequestHandler = characterRelay({
	method: 'POST',
	action: 'mend',
	signIn: 'Sign in to mend.',
	label: 'Mend',
	unavailable: "Couldn't reach Inconnu to mend."
});
