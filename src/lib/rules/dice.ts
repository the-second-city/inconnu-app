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

/**
 * Names for Difficulties, 1 and up: V5's (core rules, "Difficulty of Action") to 7, then ours, as
 * the odds get silly. The last covers everything past it.
 */
const DIFFICULTY_NAMES = [
	'Routine',
	'Straightforward',
	'Moderate',
	'Challenging',
	'Hard',
	'Very Hard',
	'Nearly Impossible',
	'Uh, sure',
	'Yeah, right',
	'How often do you even roll this?',
	'LOL'
];

/** A Difficulty's name: "Moderate" for 3, "Nearly Impossible" for 7, "LOL" for 11 or more, "None" for 0. */
export const difficultyName = (difficulty: number): string =>
	difficulty <= 0 ? 'None' : DIFFICULTY_NAMES[Math.min(difficulty, DIFFICULTY_NAMES.length) - 1];
