/**
 * Saving a character's macros, one at a time, through the app's API routes to the Inconnu API. Each
 * answers with no content; the character updates through the live update the save triggers.
 */

import { resolve } from '$app/paths';
import { MACRO_MISSING, postAction, type ActionOutcome } from '$lib/api/characterActions';
import type { Macro } from '$lib/types';

const FEATURE = 'Editing macros'; // For the upsell

/** One macro's route, by its current name. */
const macroUrl = (characterId: string, name: string) =>
	resolve('/api/characters/[id=objectid]/macros/[name=macroname]', { id: characterId, name });

/** Create a macro. The character's other macros aren't checked or changed. */
export const createMacro = (characterId: string, macro: Macro): Promise<ActionOutcome<null>> =>
	postAction(
		resolve('/api/characters/[id=objectid]/macros', { id: characterId }),
		macro,
		"Couldn't reach Inconnu to add the macro.",
		{ feature: FEATURE }
	);

/**
 * Replace a macro, by its current name (the new one may differ, which renames it). The others aren't
 * checked or changed.
 */
export const updateMacro = (
	characterId: string,
	name: string,
	macro: Macro
): Promise<ActionOutcome<null>> =>
	postAction(macroUrl(characterId, name), macro, "Couldn't reach Inconnu to save the macro.", {
		method: 'PUT',
		feature: FEATURE
	});

/**
 * Delete a macro, by name. One already gone (a 404 for the macro, not the character's own) counts as
 * deleted.
 */
export const deleteMacro = (characterId: string, name: string): Promise<ActionOutcome<null>> =>
	postAction(macroUrl(characterId, name), undefined, "Couldn't reach Inconnu to delete it.", {
		method: 'DELETE',
		feature: FEATURE,
		succeeds: (status, json) =>
			status === 404 && (json as { detail?: unknown } | null)?.detail === MACRO_MISSING
	});
