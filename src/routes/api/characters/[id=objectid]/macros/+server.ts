import type { RequestHandler } from './$types';
import { characterRelay } from '$lib/server/characterRelay';

/**
 * Save a character's macros: relays `{ macros }` (the whole list, as the bot's `VCharMacro`s) to
 * the Inconnu API's `PATCH /characters/{id}/macros`, which validates them against the character,
 * replaces its macros with them (a macro left out is deleted), and answers 204. Only the owner (or
 * a Storyteller, for an SPC) may, as in Discord; the API checks.
 */
export const PATCH: RequestHandler = characterRelay({
	method: 'PATCH',
	action: 'macros',
	signIn: 'Sign in to edit macros.',
	label: 'Macros',
	unavailable: "Couldn't reach Inconnu to save the macros."
});
