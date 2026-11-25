/**
 * Picking a pool from the sheet: while it's active, each named trait's line is a choice, and a
 * trait with specialties (or powers) offers them in a menu. Each trait is picked at most once, with
 * at most one specialty, as V5 rolls them. The character page provides it by context (setPoolPicker)
 * and activates it while a macro's pool is being built.
 */

import { getContext, setContext } from 'svelte';

import { KEY_DELIMITER } from '$lib/rules/macros';
import type { Trait } from '$lib/types';

/** A picked trait, and its specialty (null for none). */
export interface Pick {
	trait: string;
	specialty: string | null;
}

export class PoolPicker {
	active = $state(false);
	picks: Pick[] = $state([]);
	// The trait whose specialty menu is open, so only one is
	open: string | null = $state(null);

	/** A trait's pick: undefined when it isn't picked, null for no specialty, else the specialty. */
	selection(trait: string): string | null | undefined {
		return this.picks.find((pick) => pick.trait === trait)?.specialty;
	}

	/**
	 * Pick a trait, with a specialty or none. Picking what's already picked removes the trait;
	 * picking it another way switches it, keeping its place.
	 */
	pick(trait: string, specialty: string | null): void {
		const index = this.picks.findIndex((pick) => pick.trait === trait);
		if (index === -1) {
			this.picks.push({ trait, specialty });
		} else if (this.picks[index].specialty === specialty) {
			this.picks.splice(index, 1);
		} else {
			this.picks[index] = { trait, specialty };
		}
	}

	/** Drop a trait from the pool. */
	remove(trait: string): void {
		this.picks = this.picks.filter((pick) => pick.trait !== trait);
	}

	/** Empty the pool and close any menu. */
	clear(): void {
		this.picks = [];
		this.open = null;
	}

	/**
	 * The pool as a macro stores it: trait keys ("Brawl.Kindred") joined by `+`, attributes first,
	 * then in the order picked.
	 */
	tokens(traits: Trait[]): string[] {
		const isAttribute = (pick: Pick): boolean =>
			traits.some((trait) => trait.name === pick.trait && trait.type === 'attribute');
		const ordered = [
			...this.picks.filter(isAttribute),
			...this.picks.filter((pick) => !isAttribute(pick))
		];
		return ordered.flatMap((pick, i) => {
			const key = pick.specialty ? `${pick.trait}${KEY_DELIMITER}${pick.specialty}` : pick.trait;
			return i === 0 ? [key] : ['+', key];
		});
	}
}

const KEY = Symbol('pool-picker');

/** Provide a pool picker to the sheet below. */
export const setPoolPicker = (picker: PoolPicker): void => {
	setContext(KEY, picker);
};

/** The provided pool picker, or undefined where there's none (the wizard). */
export const getPoolPicker = (): PoolPicker | undefined => getContext<PoolPicker | undefined>(KEY);

/** A context map holding a picker, for rendering components in tests (`render(C, { context })`). */
export const poolPickerContext = (picker: PoolPicker): Map<symbol, PoolPicker> =>
	// Svelte reads a component's context once, so it needn't be reactive
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	new Map([[KEY, picker]]);
