/**
 * Picking a pool from the sheet: while it's active, each named trait's line is a choice, and a
 * trait with specialties (or powers) offers them in a menu. Each trait is picked at most once, with
 * at most one specialty, as V5 rolls them. The character page provides it by context (setPoolPicker)
 * and activates it while a macro's pool is being built.
 */

import { getContext, setContext } from 'svelte';

import { KEY_DELIMITER, resolvePool } from '$lib/rules/macros';
import type { Character, Trait } from '$lib/types';

/** A picked trait, its specialty (null for none), and whether it's subtracted (a flaw, say). */
export interface TraitPick {
	kind: 'trait';
	trait: string;
	specialty: string | null;
	negative: boolean;
}

/** The pool's number: dice added (or, `negative`, taken away) beyond its traits. */
export interface NumberPick {
	kind: 'number';
	dice: number; // More than 0; the sign is `negative`
	negative: boolean;
}

/** One term of a pool being picked: a trait, or its one number. */
export type Pick = TraitPick | NumberPick;

/** The key of the pool's number, among the traits' names (which can't be it). */
const NUMBER_KEY = '#';

/** How a pick is addressed (to flip or remove it): a trait's name, or the number's key. */
export const pickKey = (pick: Pick): string => (pick.kind === 'trait' ? pick.trait : NUMBER_KEY);

/** How a pick reads: a trait's name, or the number ("2"). */
export const pickLabel = (pick: Pick): string =>
	pick.kind === 'trait' ? pick.trait : String(pick.dice);

/** Whether a pick is the pool's number, not a trait. */
export const isNumber = (pick: Pick): pick is NumberPick => pick.kind === 'number';

export class PoolPicker {
	active = $state(false);
	picks: Pick[] = $state([]);
	// The trait whose specialty menu is open, so only one is
	open: string | null = $state(null);
	// How many times a trait was added by picking (not loading), so the panel can collapse to its
	// strip when one is
	added = $state(0);

	/** A trait's pick, if it's picked. */
	#trait(trait: string): TraitPick | undefined {
		return this.picks.find(
			(pick): pick is TraitPick => pick.kind === 'trait' && pick.trait === trait
		);
	}

	/** A trait's pick: undefined when it isn't picked, null for no specialty, else the specialty. */
	selection(trait: string): string | null | undefined {
		return this.#trait(trait)?.specialty;
	}

	/** Whether a picked trait is subtracted. */
	isNegative(trait: string): boolean {
		return this.#trait(trait)?.negative ?? false;
	}

	/**
	 * Pick a trait, with a specialty or none, added to the pool. Picking what's already picked
	 * removes the trait; picking it another way switches it, keeping its place and sign.
	 */
	pick(trait: string, specialty: string | null): void {
		const picked = this.#trait(trait);
		if (!picked) {
			this.picks.push({ kind: 'trait', trait, specialty, negative: false });
			this.added++;
		} else if (picked.specialty === specialty) {
			this.remove(trait);
		} else {
			this.#replace(picked, { ...picked, specialty });
		}
	}

	/** Put `next` where `pick` is. */
	#replace(pick: Pick, next: Pick): void {
		const index = this.picks.indexOf(pick);
		if (index !== -1) this.picks[index] = next;
	}

	/** The pick of a key (see `pickKey`). */
	#byKey(key: string): Pick | undefined {
		return this.picks.find((pick) => pickKey(pick) === key);
	}

	/** Whether a pick's sign can flip (by its key): a pool must keep something to add. */
	canFlip(key: string): boolean {
		const pick = this.#byKey(key);
		if (!pick) return false;
		return pick.negative || this.picks.some((p) => p !== pick && !p.negative);
	}

	/** Flip a pick (by its key) between added and subtracted. */
	flip(key: string): void {
		const pick = this.#byKey(key);
		if (!pick || !this.canFlip(key)) return;
		this.#replace(pick, { ...pick, negative: !pick.negative });
	}

	/** Drop a pick (by its key: a trait's name, or the number's) from the pool. */
	remove(key: string): void {
		this.picks = this.picks.filter((pick) => pickKey(pick) !== key);
	}

	/**
	 * Load a macro's pool (the bot's tokens) to edit it. Traits take the names the character has
	 * now, so the sheet shows them picked; what the sheet can't pick (numbers, Willpower or Hunger, a
	 * trait the character lost) loads too, to keep or remove. A trait in the pool twice loads once,
	 * and its numbers combine into one.
	 */
	load(pool: string[], character: Character): void {
		this.picks = picksFromPool(pool, character);
		this.open = null;
	}

	/**
	 * The pool's number, signed: dice added (or taken away) beyond its traits. A pool has one at
	 * most (loading combines a macro's numbers).
	 */
	get modifier(): number {
		const pick = this.picks.find(isNumber);
		if (!pick) return 0;
		return (pick.negative ? -1 : 1) * pick.dice;
	}

	/** Set the pool's number (0 drops it), keeping its place. */
	set modifier(value: number) {
		const pick = this.picks.find(isNumber);
		const next: NumberPick = { kind: 'number', dice: Math.abs(value), negative: value < 0 };
		if (value === 0) {
			if (pick) this.remove(NUMBER_KEY);
		} else if (!pick) {
			this.picks.push(next);
		} else {
			this.#replace(pick, next);
		}
	}

	/** Whether the pool adds anything: it can't be all subtracted (or empty). */
	get adds(): boolean {
		return this.picks.some((pick) => !pick.negative);
	}

	/** Whether the pool has a trait being added (something for the modifier to subtract from). */
	get addsTrait(): boolean {
		return this.picks.some((pick) => pick.kind === 'trait' && !pick.negative);
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
			pick.kind === 'trait' &&
			traits.some((trait) => trait.name === pick.trait && trait.type === 'attribute');
		const added = this.picks.filter((pick) => !pick.negative);
		return [
			...added.filter(isAttribute),
			...added.filter((pick) => !isAttribute(pick)),
			...this.picks.filter((pick) => pick.negative)
		];
	}

	/** The pool as a macro stores it: trait keys ("Brawl.Kindred") and numbers, joined by `+` and `-`. */
	tokens(traits: Trait[]): string[] {
		return this.ordered(traits).flatMap((pick, i) => {
			const token =
				pick.kind === 'number'
					? String(pick.dice)
					: pick.specialty
						? `${pick.trait}${KEY_DELIMITER}${pick.specialty}`
						: pick.trait;
			if (i === 0) return [token];
			return [pick.negative ? '-' : '+', token];
		});
	}
}

/**
 * A macro's pool as picks (see `PoolPicker.load`): traits by the sheet's names, numbers combined
 * into one, a trait in it twice once. The sheet highlight reads pools this way too.
 */
export const picksFromPool = (pool: string[], character: Character): Pick[] => {
	const picks: Pick[] = [];
	let number = 0;
	let numbered = false;
	for (const term of resolvePool(pool, character).terms) {
		const negative = term.sign === '-';
		if (term.kind === 'number') {
			number += (negative ? -1 : 1) * Number(term.name);
			numbered = true;
		} else if (!picks.some((pick) => pick.kind === 'trait' && pick.trait === term.name)) {
			const specialty = term.specialties.length ? term.specialties.join(KEY_DELIMITER) : null;
			picks.push({ kind: 'trait', trait: term.name, specialty, negative });
		}
	}
	if (numbered && number !== 0) {
		picks.push({ kind: 'number', dice: Math.abs(number), negative: number < 0 });
	}
	return picks;
};

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
