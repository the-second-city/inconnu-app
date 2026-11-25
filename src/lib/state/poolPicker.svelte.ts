/**
 * Picking a pool from the sheet: while it's active, each named trait's line is a choice, and a
 * trait with specialties (or powers) offers them in a menu. Each trait is picked at most once, with
 * at most one specialty, as V5 rolls them. The character page provides it by context (setPoolPicker)
 * and activates it while a macro's pool is being built.
 */

import { getContext, setContext } from 'svelte';

import { KEY_DELIMITER } from '$lib/rules/macros';
import type { Trait } from '$lib/types';

/** A picked trait, its specialty (null for none), and whether it's subtracted (a flaw, say). */
export interface Pick {
	trait: string;
	specialty: string | null;
	negative: boolean;
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

	/** Whether a picked trait is subtracted. */
	isNegative(trait: string): boolean {
		return this.picks.find((pick) => pick.trait === trait)?.negative ?? false;
	}

	/**
	 * Pick a trait, with a specialty or none, added to the pool. Picking what's already picked
	 * removes the trait; picking it another way switches it, keeping its place and sign.
	 */
	pick(trait: string, specialty: string | null): void {
		const index = this.picks.findIndex((pick) => pick.trait === trait);
		if (index === -1) {
			this.picks.push({ trait, specialty, negative: false });
		} else if (this.picks[index].specialty === specialty) {
			this.picks.splice(index, 1);
		} else {
			this.picks[index] = { ...this.picks[index], specialty };
		}
	}

	/** Whether a picked trait's sign can flip: a pool must keep something to add. */
	canFlip(trait: string): boolean {
		const pick = this.picks.find((p) => p.trait === trait);
		if (!pick) return false;
		return pick.negative || this.picks.some((p) => p !== pick && !p.negative);
	}

	/** Flip a picked trait between added and subtracted. */
	flip(trait: string): void {
		const index = this.picks.findIndex((pick) => pick.trait === trait);
		if (index === -1 || !this.canFlip(trait)) return;
		this.picks[index] = { ...this.picks[index], negative: !this.picks[index].negative };
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
	 * The picks in the pool's order: the added ones (attributes first, then in the order picked),
	 * then the subtracted ones, as pools are written ("Manipulation + Occult - Obvious Predator").
	 */
	ordered(traits: Trait[]): Pick[] {
		const isAttribute = (pick: Pick): boolean =>
			traits.some((trait) => trait.name === pick.trait && trait.type === 'attribute');
		const added = this.picks.filter((pick) => !pick.negative);
		return [
			...added.filter(isAttribute),
			...added.filter((pick) => !isAttribute(pick)),
			...this.picks.filter((pick) => pick.negative)
		];
	}

	/** The pool as a macro stores it: trait keys ("Brawl.Kindred") joined by `+` and `-`. */
	tokens(traits: Trait[]): string[] {
		return this.ordered(traits).flatMap((pick, i) => {
			const key = pick.specialty ? `${pick.trait}${KEY_DELIMITER}${pick.specialty}` : pick.trait;
			if (i === 0) return [key];
			return [pick.negative ? '-' : '+', key];
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
