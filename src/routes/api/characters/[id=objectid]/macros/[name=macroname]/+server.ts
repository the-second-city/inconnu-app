import type { RequestHandler } from './$types';
import { characterRelay } from '$lib/server/characterRelay';

/**
 * Delete one of a character's macros: relays to the Inconnu API's
 * `DELETE /characters/{id}/macros/{name}`, which deletes it by name (ignoring case) and answers
 * 204, or 404 with "Macro not found". Unlike saving the macros, it doesn't check the others. Only
 * the owner (or a Storyteller, for an SPC) may, as in Discord; the API checks.
 */
export const DELETE: RequestHandler = characterRelay({
	method: 'DELETE',
	action: ({ name }) => `macros/${encodeURIComponent(name)}`,
	signIn: 'Sign in to delete macros.',
	label: 'Delete macro',
	unavailable: "Couldn't reach Inconnu to delete the macro."
});
