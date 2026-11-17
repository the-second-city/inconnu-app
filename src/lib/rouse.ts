/** Rouse check odds. Each check succeeds on a 6 or more (half the time); a failure raises Hunger. */

/**
 * The chance, 0-1, that Rouse checks raise Hunger: any check failing. Re-rolling failures (from
 * Blood Potency) means a check fails only when both rolls do.
 */
export const hungerRiseChance = (count: number, reroll: boolean): number =>
	1 - (reroll ? 0.75 : 0.5) ** count;

/** A chance as a whole percentage ("88%"). */
export const percent = (chance: number): string => `${Math.round(chance * 100)}%`;
