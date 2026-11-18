/**
 * Gameplay actions on a character (Rouse, Mend, Take Damage, Slake, Stains, Remorse, Frenzy), sent
 * through the app's API routes to the Inconnu API, which logs them and posts them to the update
 * channel.
 */

import { resolve } from '$app/paths';
import { refusedForPremium, showUpsell, SUPPORTERS_ONLY } from '$lib/premium.svelte';
import type {
	AmountRequest,
	DamageRequest,
	FrenzyRequest,
	FrenzyResult,
	MendRequest,
	MendResult,
	RemorseRequest,
	RemorseResult,
	RouseRequest,
	RouseResult,
	SlakeResult
} from '$lib/types';

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

	if (refusedForPremium(status, json)) return `${SUPPORTERS_ONLY}.`;

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

/**
 * POST an action to one of a character's routes, returning its result or why it failed. An action
 * that answers 204 (no content) succeeds with a null result. The API refusing a non-supporter also
 * opens the upsell.
 */
const postAction = async <T>(
	url: string,
	body: unknown,
	unreachable: string
): Promise<ActionOutcome<T>> => {
	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (response.status === 204) return { result: null as T };
		const json = await response.json().catch(() => null);
		if (response.ok && json) return { result: json as T };
		if (refusedForPremium(response.status, json)) showUpsell('Using gameplay actions');
		return { error: actionError(response.status, json) };
	} catch {
		return { error: unreachable };
	}
};

/** Make Rouse checks for a character. */
export const rouse = (
	characterId: string,
	request: RouseRequest
): Promise<ActionOutcome<RouseResult>> =>
	postAction(
		resolve('/api/characters/[id=objectid]/rouse', { id: characterId }),
		request,
		"Couldn't reach Inconnu to Rouse."
	);

/** Heal a character's damage, as `/mend` (Superficial) and `/aggheal` (Aggravated) do. */
export const mend = (
	characterId: string,
	request: MendRequest
): Promise<ActionOutcome<MendResult>> =>
	postAction(
		resolve('/api/characters/[id=objectid]/mend', { id: characterId }),
		request,
		"Couldn't reach Inconnu to mend."
	);

/**
 * Deal damage to one of a character's tracks: Superficial first, then Aggravated. The API answers
 * with no content; the sheet updates through the live update the save triggers.
 */
export const damage = (characterId: string, request: DamageRequest): Promise<ActionOutcome<null>> =>
	postAction(
		resolve('/api/characters/[id=objectid]/damage', { id: characterId }),
		request,
		"Couldn't reach Inconnu to deal damage."
	);

/**
 * Slake a character's Hunger, as `/slake` does (down to 0). The result says whether it calls for a
 * frenzy test (slaking from Hunger 4 or more).
 */
export const slake = (
	characterId: string,
	request: AmountRequest
): Promise<ActionOutcome<SlakeResult>> =>
	postAction(
		resolve('/api/characters/[id=objectid]/slake', { id: characterId }),
		request,
		"Couldn't reach Inconnu to slake."
	);

/**
 * Add Stains to a character, as `/stain` does (up to 10; overflowing Humanity deals Aggravated
 * Willpower damage). The API answers with no content.
 */
export const stain = (characterId: string, request: AmountRequest): Promise<ActionOutcome<null>> =>
	postAction(
		resolve('/api/characters/[id=objectid]/stain', { id: characterId }),
		request,
		"Couldn't reach Inconnu to add Stains."
	);

/** Make a Remorse test, as `/remorse` does: failing costs a Humanity, and either way Stains clear. */
export const remorse = (
	characterId: string,
	request: RemorseRequest
): Promise<ActionOutcome<RemorseResult>> =>
	postAction(
		resolve('/api/characters/[id=objectid]/remorse', { id: characterId }),
		request,
		"Couldn't reach Inconnu to test Remorse."
	);

/** Make a frenzy test, as `/frenzy` does. */
export const frenzy = (
	characterId: string,
	request: FrenzyRequest
): Promise<ActionOutcome<FrenzyResult>> =>
	postAction(
		resolve('/api/characters/[id=objectid]/frenzy', { id: characterId }),
		request,
		"Couldn't reach Inconnu to test for frenzy."
	);
