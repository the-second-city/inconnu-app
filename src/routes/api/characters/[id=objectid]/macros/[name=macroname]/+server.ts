import type { RequestHandler } from './$types';
import { characterRelay } from '$lib/server/characterRelay';

/** The macro's path on the Inconnu API, by its current name. */
const action = ({ name }: Record<string, string>): string => `macros/${encodeURIComponent(name)}`;

/**
 * Replace one of a character's macros: relays it (a bare `VCharMacro`, whose name may differ, which
 * renames it) to the Inconnu API's `PUT /characters/{id}/macros/{name}`, which validates it against
 * the character, but not the others, and answers 204, or 404 with "Macro not found". Only the owner
 * (or a Storyteller, for an SPC) may, as in Discord; the API checks.
 */
export const PUT: RequestHandler = characterRelay({
	method: 'PUT',
	action,
	signIn: 'Sign in to edit macros.',
	label: 'Update macro',
	unavailable: "Couldn't reach Inconnu to save the macro."
});

/**
 * Delete one of a character's macros: relays to the Inconnu API's
 * `DELETE /characters/{id}/macros/{name}`, which deletes it by name (ignoring case) and answers
 * 204, or 404 with "Macro not found". Only the owner (or a Storyteller, for an SPC) may, as in Discord; the API checks.
 */
export const DELETE: RequestHandler = characterRelay({
	method: 'DELETE',
	action,
	signIn: 'Sign in to delete macros.',
	label: 'Delete macro',
	unavailable: "Couldn't reach Inconnu to delete the macro."
});
