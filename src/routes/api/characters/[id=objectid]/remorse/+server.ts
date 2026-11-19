import type { RequestHandler } from './$types';
import { characterRelay } from '$lib/server/characterRelay';

/**
 * Make a Remorse test: relays `{ min_override, lasombra_alt }` to the Inconnu API's
 * `POST /characters/{id}/remorse`, which rolls it as `/remorse` does (failing costs a Humanity;
 * either way the Stains clear), logs it, posts it to the update channel, and answers with a
 * `RemorseResult`. The API checks that the viewer may test the character (the owner, or a
 * Storyteller for an SPC).
 */
export const POST: RequestHandler = characterRelay({
	method: 'POST',
	action: 'remorse',
	signIn: 'Sign in to test Remorse.',
	label: 'Remorse',
	unavailable: "Couldn't reach Inconnu to test Remorse."
});
