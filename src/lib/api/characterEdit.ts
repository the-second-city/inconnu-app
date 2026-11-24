/**
 * Saving edit mode's changes: the body sent to the Inconnu API's `PATCH /characters/{id}`, and
 * turning a failed save's response into messages for the user.
 */

import { cleanName, normalize } from '..';
import { bloodPotency, isVampiric } from '$lib/rules/vampire';
import type { Character, Trait } from '$lib/types';
import { refusedForPremium, SUPPORTERS_ONLY } from '$lib/state/premium.svelte';

/** The edit body: every editable field, all at once. */
export interface CharacterEdit {
	name: string;
	health: string;
	willpower: string;
	humanity: number;
	stains: number;
	potency?: number; // Vampires and thin-bloods only
	hunger?: number; // Vampires and thin-bloods only
	convictions: string[];
	profile: { description: string; biography: string };
	traits: Trait[];
}

/**
 * The edit body for a character, with its (edited) name. The API includes Blood Potency and
 * Hunger for every character, but the bot refuses them for mortals and ghouls, and requires them
 * for vampires and thin-bloods. Profile text may be null in the character, but must be a string
 * here, and images aren't edited.
 */
export const editBody = (char: Character, name: string): CharacterEdit => ({
	name: cleanName(name),
	health: char.health,
	willpower: char.willpower,
	humanity: char.humanity,
	stains: char.stains,
	...(isVampiric(char.splat) ? { potency: bloodPotency(char), hunger: char.hunger ?? 0 } : {}),
	convictions: (char.convictions ?? []).map(normalize), // The bot drops blank ones
	profile: {
		description: char.profile.description ?? '',
		biography: char.profile.biography ?? ''
	},
	// Only the fields the bot takes
	traits: char.traits.map(({ name, rating, type, subtraits }) => ({
		name,
		rating,
		type,
		subtraits
	}))
});

/** Why a save failed: a message for the name field, if it's the name, and the rest as a list. */
export interface SaveErrors {
	name: string | null;
	messages: string[];
}

/** One of FastAPI's validation errors. */
interface ValidationError {
	loc: (string | number)[];
	msg: string;
}

const FIELD_LABELS: Record<string, string> = {
	name: 'Name',
	health: 'Health',
	willpower: 'Willpower',
	humanity: 'Humanity',
	stains: 'Stains',
	potency: 'Blood Potency',
	hunger: 'Hunger',
	convictions: 'Convictions',
	description: 'Description',
	biography: 'History',
	profile: 'Profile'
};

/** What a validation error's location refers to, for the user: a field, or a trait by name. */
const label = (loc: (string | number)[], body: CharacterEdit): string | null => {
	const [, field, index, part] = loc; // loc[0] is "body"
	if (field === 'traits' && typeof index === 'number') {
		const trait = body.traits[index]?.name ?? `Trait ${index + 1}`;
		return part === 'subtraits' ? `${trait} specialties` : trait;
	}
	if (field === 'profile' && typeof index === 'string') return FIELD_LABELS[index] ?? null;
	return typeof field === 'string' ? (FIELD_LABELS[field] ?? field) : null;
};

/** Whether a value is one of FastAPI's validation errors. */
const isValidationError = (value: unknown): value is ValidationError =>
	typeof value === 'object' &&
	value !== null &&
	Array.isArray((value as ValidationError).loc) &&
	typeof (value as ValidationError).msg === 'string';

/** A validation error's message without Pydantic's "Value error, " prefix. */
const message = (msg: string): string => msg.replace(/^Value error, /, '');

const STATUS_MESSAGES: Record<number, string> = {
	401: 'Your session has ended. Sign in again to save.',
	403: 'You can no longer edit this character.',
	404: "This character no longer exists, or you're no longer in its server.",
	503: 'Inconnu is starting up. Try again in a moment.'
};

/**
 * Why a save failed, from the response's status and JSON body (null if it had none). A 422 lists
 * each invalid field; anything else is one message.
 */
export const saveErrors = (status: number, json: unknown, body: CharacterEdit): SaveErrors => {
	const errors: SaveErrors = { name: null, messages: [] };
	const detail = (json as { detail?: unknown } | null)?.detail;

	if (status === 422 && Array.isArray(detail)) {
		for (const entry of detail as unknown[]) {
			// Expect FastAPI's shape, but don't trust it: anything else is shown as best it can be
			if (!isValidationError(entry)) {
				errors.messages.push(typeof entry === 'string' ? entry : "Some changes weren't valid.");
				continue;
			}
			const { loc, msg } = entry;
			if (loc[1] === 'name' && loc.length === 2) {
				errors.name = message(msg);
				continue;
			}
			const where = label(loc, body);
			errors.messages.push(where ? `${where}: ${message(msg)}` : message(msg));
		}
		return errors;
	}

	if (refusedForPremium(status, json)) {
		errors.messages.push(`${SUPPORTERS_ONLY}.`);
		return errors;
	}

	const fallback = (json as { message?: unknown } | null)?.message;
	errors.messages.push(
		STATUS_MESSAGES[status] ??
			(typeof detail === 'string' ? detail : null) ??
			(typeof fallback === 'string' ? fallback : null) ??
			"Couldn't save your changes. Try again."
	);
	return errors;
};
