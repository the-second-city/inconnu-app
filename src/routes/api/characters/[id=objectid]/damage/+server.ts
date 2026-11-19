import type { RequestHandler } from './$types';
import { characterRelay } from '$lib/server/characterRelay';

/**
 * Deal damage: relays `{ track, superficial, aggravated }` to the Inconnu API's
 * `POST /characters/{id}/damage`, which applies the Superficial, then the Aggravated, damage (as
 * the app's preview does), logs it, posts it to the update channel, and answers 204. The API checks
 * that the viewer may damage the character.
 */
export const POST: RequestHandler = characterRelay({
	method: 'POST',
	action: 'damage',
	signIn: 'Sign in to deal damage.',
	label: 'Damage',
	unavailable: "Couldn't reach Inconnu to deal damage."
});
