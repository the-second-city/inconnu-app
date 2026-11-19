import type { RequestHandler } from './$types';
import { characterRelay } from '$lib/server/characterRelay';

/**
 * Slake Hunger: relays `{ amount }` to the Inconnu API's `POST /characters/{id}/slake`, which slakes
 * as `/slake` does (down to 0), logs it, posts it to the update channel, and answers with a
 * `SlakeResult` (whether to test for frenzy). The API checks
 * that the viewer may slake the character (the owner, or a Storyteller for an SPC).
 */
export const POST: RequestHandler = characterRelay({
	method: 'POST',
	action: 'slake',
	signIn: 'Sign in to slake.',
	label: 'Slake',
	unavailable: "Couldn't reach Inconnu to slake."
});
