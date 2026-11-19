import type { RequestHandler } from './$types';
import { characterRelay } from '$lib/server/characterRelay';

/**
 * Make a frenzy test: relays `{ difficulty, penalty, bonus, advantages }` to the Inconnu API's
 * `POST /characters/{id}/frenzy`, which rolls it as `/frenzy` does, logs it, posts it to the update
 * channel, and answers with a `FrenzyResult`. The API checks that the viewer may test the character
 * (the owner, or a Storyteller for an SPC).
 */
export const POST: RequestHandler = characterRelay({
	method: 'POST',
	action: 'frenzy',
	signIn: 'Sign in to test for frenzy.',
	label: 'Frenzy',
	unavailable: "Couldn't reach Inconnu to test for frenzy."
});
