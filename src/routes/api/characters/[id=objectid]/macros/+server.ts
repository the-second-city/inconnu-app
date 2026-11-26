import type { RequestHandler } from './$types';
import { characterRelay } from '$lib/server/characterRelay';

/**
 * Create a macro: relays it (a bare `VCharMacro`) to the Inconnu API's
 * `POST /characters/{id}/macros`, which validates it against the character, but not the others, and
 * answers 204. Only the owner (or a Storyteller, for an SPC) may, as in Discord; the API checks.
 */
export const POST: RequestHandler = characterRelay({
	method: 'POST',
	action: 'macros',
	signIn: 'Sign in to add macros.',
	label: 'Create macro',
	unavailable: "Couldn't reach Inconnu to add the macro."
});
