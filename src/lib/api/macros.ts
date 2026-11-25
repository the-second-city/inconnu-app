/** Saving a character's macros, through the app's API route to the Inconnu API. */

import { resolve } from '$app/paths';
import { actionError, postAction, type ActionOutcome } from '$lib/api/characterActions';
import { refusedForPremium, showUpsell } from '$lib/state/premium.svelte';
import type { Macro } from '$lib/types';

/** Sort macros as the bot keeps them: by name, ignoring case. */
export const sortMacros = (macros: Macro[]): Macro[] =>
	[...macros].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

/**
 * Save a character's macros: the whole list (`{ macros }`), which replaces the character's (so one
 * left out is deleted). The API answers with no content; the character updates through the live
 * update the save triggers.
 */
export const saveMacros = (characterId: string, macros: Macro[]): Promise<ActionOutcome<null>> =>
	postAction(
		resolve('/api/characters/[id=objectid]/macros', { id: characterId }),
		{ macros: sortMacros(macros) },
		"Couldn't reach Inconnu to save the macros.",
		{ method: 'PATCH', feature: 'Editing macros' }
	);

/**
 * Delete one of a character's macros, by name. One already gone (a 404 saying "Macro not found",
 * not the character's own 404) counts as deleted. The API answers with no content; the character
 * updates through the live update.
 */
export const deleteMacro = async (
	characterId: string,
	name: string
): Promise<ActionOutcome<null>> => {
	const url = resolve('/api/characters/[id=objectid]/macros/[name=macroname]', {
		id: characterId,
		name
	});
	try {
		const response = await fetch(url, { method: 'DELETE' });
		if (response.ok) return { result: null };
		const json = await response.json().catch(() => null);
		if (response.status === 404 && (json as { detail?: unknown } | null)?.detail === MISSING) {
			return { result: null };
		}
		if (refusedForPremium(response.status, json)) showUpsell('Editing macros');
		return { error: actionError(response.status, json) };
	} catch {
		return { error: "Couldn't reach Inconnu to delete it." };
	}
};

/** The API's 404 detail for a macro the character doesn't have. */
const MISSING = 'Macro not found';
