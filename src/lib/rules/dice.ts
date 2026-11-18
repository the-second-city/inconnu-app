/** Dice shown as rolled: V5's d10s, where a 6 or more succeeds. */

/** Whether a die succeeds (6 or more). */
export const isSuccess = (die: number): boolean => die >= 6;

/** Successes among dice: one per 6 or more, and two more for each pair of 10s (a critical). */
export const countSuccesses = (dice: number[]): number => {
	const tens = dice.filter((die) => die === 10).length;
	return dice.filter(isSuccess).length + 2 * Math.floor(tens / 2);
};

/**
 * Dice with the successes moved to the end, each group keeping the order rolled (not a sort), so a
 * reveal builds to them.
 */
export const successesLast = (dice: number[]): number[] => [
	...dice.filter((die) => !isSuccess(die)),
	...dice.filter(isSuccess)
];
