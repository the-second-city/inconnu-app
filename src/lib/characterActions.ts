/**
 * Gameplay actions on a character (Rouse, and later Take Damage, Mend, Slake), sent through the
 * app's API routes to the Inconnu API, which logs them and posts them to the update channel.
 */

import { resolve } from '$app/paths';
import type { RouseRequest, RouseResult } from '$lib/types';

/** An action's outcome: its result, or why it failed, for the user. */
export type ActionOutcome<T> = { result: T; error?: never } | { result?: never; error: string };

/** Why an action failed, from its response's status and JSON body (null if it had none). */
export const actionError = (status: number, json: unknown): string => {
	const body = json as { detail?: unknown; message?: unknown } | null;
	const detail = body?.detail;

	// FastAPI's validation errors: show their messages, without Pydantic's prefix
	if (Array.isArray(detail)) {
		const messages = detail
			.map((entry) => (entry as { msg?: unknown })?.msg)
			.filter((msg): msg is string => typeof msg === 'string')
			.map((msg) => msg.replace(/^Value error, /, ''));
		if (messages.length > 0) return messages.join(' ');
	}

	switch (status) {
		case 401:
			return 'Your session has ended. Sign in again.';
		case 403:
			return "You can't do that for this character.";
		case 404:
			return "This character no longer exists, or you're no longer in its server.";
		case 503:
			return 'Inconnu is starting up. Try again in a moment.';
	}
	if (typeof detail === 'string') return detail;
	if (typeof body?.message === 'string') return body.message;
	return 'Something went wrong. Try again.';
};

/** Make Rouse checks for a character. */
export const rouse = async (
	characterId: string,
	request: RouseRequest
): Promise<ActionOutcome<RouseResult>> => {
	try {
		const response = await fetch(
			resolve('/api/characters/[id=objectid]/rouse', { id: characterId }),
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(request)
			}
		);
		const json = await response.json().catch(() => null);
		if (response.ok && json) return { result: json as RouseResult };
		return { error: actionError(response.status, json) };
	} catch {
		return { error: "Couldn't reach Inconnu to Rouse." };
	}
};
