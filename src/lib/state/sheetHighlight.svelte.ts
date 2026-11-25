/**
 * Showing a macro's traits on the sheet while its card is hovered: each line a pool rolls is marked
 * (TraitLine's `data-highlight`), added or subtracted. The character page provides it by context
 * (setSheetHighlight), beside the PoolPicker; it's separate from picking, which it skips.
 */

import { getContext, setContext } from 'svelte';

import { picksFromPool, type Pick } from '$lib/state/poolPicker.svelte';
import type { Character } from '$lib/types';

export class SheetHighlight {
	/** The highlighted traits, read as picks (by the sheet's names, with their signs). */
	picks: Pick[] = $state([]);

	/** Highlight a macro's traits. */
	show(pool: string[], character: Character): void {
		this.picks = picksFromPool(pool, character);
	}

	/** Stop highlighting. */
	hide(): void {
		this.picks = [];
	}

	/** A trait's highlight: undefined when the highlighted pool doesn't roll it. */
	of(trait: string): Pick | undefined {
		return this.picks.find((pick) => pick.trait === trait);
	}
}

const KEY = Symbol('sheet-highlight');

/** Provide a sheet highlight to the sheet below. */
export const setSheetHighlight = (highlight: SheetHighlight): void => {
	setContext(KEY, highlight);
};

/** The provided sheet highlight, or undefined where there's none (the wizard). */
export const getSheetHighlight = (): SheetHighlight | undefined =>
	getContext<SheetHighlight | undefined>(KEY);

/** A context map holding a highlight, for rendering components in tests (`render(C, { context })`). */
export const sheetHighlightContext = (highlight: SheetHighlight): Map<symbol, SheetHighlight> =>
	// Svelte reads a component's context once, so it needn't be reactive
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	new Map([[KEY, highlight]]);
