/** Saving a character's macros, through the app's API route to the Inconnu API. */

import { resolve } from '$app/paths';
import { postAction, type ActionOutcome } from '$lib/api/characterActions';
import type { Macro } from '$lib/types';

/** Sort macros as the bot keeps them: by name, ignoring case. */
export const sortMacros = (macros: Macro[]): Macro[] =>
	[...macros].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

/**
 * Save a character's macros: the whole list, which replaces the character's (so one left out is
 * deleted). The API answers with no content; the character updates through the live update the
 * save triggers.
 */
export const saveMacros = (characterId: string, macros: Macro[]): Promise<ActionOutcome<null>> =>
	postAction(
		resolve('/api/characters/[id=objectid]/macros', { id: characterId }),
		sortMacros(macros),
		"Couldn't reach Inconnu to save the macros.",
		{ method: 'PATCH', feature: 'Editing macros' }
	);
