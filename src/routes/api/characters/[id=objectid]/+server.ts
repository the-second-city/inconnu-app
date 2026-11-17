import type { RequestHandler } from './$types';
import { characterRelay } from '$lib/server/characterRelay';

/**
 * Save edit mode's changes to a character: relays the edit to the Inconnu API's
 * `PATCH /characters/{id}`, which checks that the viewer may edit it (owner or Storyteller).
 *
 * The API answers 204 on success, and a status with a JSON body otherwise (a 422's `detail` lists
 * each invalid field).
 */
export const PATCH: RequestHandler = characterRelay({
	method: 'PATCH',
	action: null,
	signIn: 'Sign in to save changes.',
	label: 'Edit',
	unavailable: "Couldn't reach Inconnu to save your changes."
});
