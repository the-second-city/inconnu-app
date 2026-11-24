import type { RequestHandler } from './$types';
import { characterRelay } from '$lib/server/characterRelay';

/**
 * Save a character's macros: relays the whole list (`Macro[]`, as the bot's `VCharMacro`) to the
 * Inconnu API's `PATCH /characters/{id}/macros`, which replaces the character's macros with it
 * (a macro left out is deleted) and answers 204. The API checks the viewer may edit the character.
 */
export const PATCH: RequestHandler = characterRelay({
	method: 'PATCH',
	action: 'macros',
	signIn: 'Sign in to edit macros.',
	label: 'Macros',
	unavailable: "Couldn't reach Inconnu to save the macros."
});
