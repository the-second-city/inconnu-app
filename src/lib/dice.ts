/** Dice shown as rolled: V5's d10s, where a 6 or more succeeds. */

/** Whether a die succeeds (6 or more). */
export const isSuccess = (die: number): boolean => die >= 6;

/**
 * Dice with the successes moved to the end, each group keeping the order rolled (not a sort), so a
 * reveal builds to them.
 */
export const successesLast = (dice: number[]): number[] => [
	...dice.filter((die) => !isSuccess(die)),
	...dice.filter(isSuccess)
];
