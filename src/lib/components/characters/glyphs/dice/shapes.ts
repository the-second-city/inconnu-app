// The dice faces' shapes (100x100 viewBox), drawn after the bot's dice emoji (inconnu's
// assets/emoji: ln_* for normal dice, h_* for Hunger dice). Each is a list of filled paths in one
// color. Plain data with no imports, so scripts can use it too.

/** A normal die's color, as the bot's emoji. */
export const NORMAL_COLOR = '#888888';

/** A Hunger die's color, as the bot's emoji. */
export const HUNGER_COLOR = '#DD3E3E';

/** A failure (1-5): a dot. */
export const FAILURE = ['M 50,30.5 A 19.5,19.5 0 1 1 50,69.5 A 19.5,19.5 0 1 1 50,30.5 Z'];

/** The ankh-dagger of a success (6-9), and of a critical under its ornaments. */
export const SUCCESS = [
	// The loop, with its hole (fill-rule evenodd)
	'M 50,1 A 17,19 0 1 1 50,39 A 17,19 0 1 1 50,1 Z M 50,12 A 10,11 0 1 0 50,34 A 10,11 0 1 0 50,12 Z',
	// The pommel, pointing up into the loop
	'M 50,16.5 L 55,21.5 L 53,24.5 L 53,33 L 47,33 L 47,24.5 L 45,21.5 Z',
	// The crossguard, flaring at its ends
	'M 24,29.5 Q 27,32.5 31,33 L 69,33 Q 73,32.5 76,29.5 L 75,36 L 76,42.5 Q 73,39.5 69,39 L 31,39 Q 27,39.5 24,42.5 L 25,36 Z',
	// The blade
	'M 46.5,38 L 53.5,38 C 53.5,41.5 52,42.5 52,45.5 C 52,49.5 55.5,52 55.5,57.5 C 55.5,70 52.5,87 50,99 C 47.5,87 44.5,70 44.5,57.5 C 44.5,52 48,49.5 48,45.5 C 48,42.5 46.5,41.5 46.5,38 Z'
];

/** A normal critical (10): the ankh between two stars. */
export const CRITICAL = [
	...SUCCESS,
	'M 27,47 L 30.1,55.8 L 39.4,56 L 31.9,61.6 L 34.6,70.5 L 27,65.2 L 19.4,70.5 L 22.1,61.6 L 14.6,56 L 23.9,55.8 Z',
	'M 73,47 L 76.1,55.8 L 85.4,56 L 77.9,61.6 L 80.6,70.5 L 73,65.2 L 65.4,70.5 L 68.1,61.6 L 60.6,56 L 69.9,55.8 Z'
];

/** A Hunger critical (10): the ankh between two drips of blood. */
export const HUNGER_CRITICAL = [
	...SUCCESS,
	'M 21,45 L 40,45 L 39,49.5 C 38,58 36.5,69 35,80 C 33,69 30,58 27,51.5 C 25.5,48.5 23.5,46 21,45 Z',
	'M 79,45 L 60,45 L 61,49.5 C 62,58 63.5,69 65,80 C 67,69 70,58 73,51.5 C 74.5,48.5 76.5,46 79,45 Z'
];

/** A bestial failure (a Hunger 1): a fanged skull, with its eyes (fill-rule evenodd). */
export const BESTIAL = [
	'M 50,14 C 68,14 78,18 78,31 C 78,38 76,42 77,47 C 78,53 76.5,58 73,61 C 70,63 68,65 67.5,68 C 66.5,73 65,79 63,85 C 61.5,80 60.5,75 59.5,70.5 C 55,69.5 45,69.5 40.5,70.5 C 39.5,75 38.5,80 37,85 C 35,79 33.5,73 32.5,68 C 32,65 30,63 27,61 C 23.5,58 22,53 23,47 C 24,42 22,38 22,31 C 22,18 32,14 50,14 Z ' +
		'M 29,48.5 C 34,46 40,47.5 45.5,51.5 C 44.5,55.5 40.5,57.5 35.5,57.5 C 31,57.5 28,53.5 29,48.5 Z ' +
		'M 71,48.5 C 66,46 60,47.5 54.5,51.5 C 55.5,55.5 59.5,57.5 64.5,57.5 C 69,57.5 72,53.5 71,48.5 Z'
];

/** A die's face: what its number means. */
export type Face = 'failure' | 'success' | 'critical' | 'bestial';

/**
 * The face a die's number shows.
 * @param value The number rolled, 1-10
 * @param hunger Whether it's a Hunger die, whose 1 is a bestial failure
 * @returns Its face
 */
export function dieFace(value: number, hunger: boolean): Face {
	if (value === 10) return 'critical';
	if (value >= 6) return 'success';
	return hunger && value === 1 ? 'bestial' : 'failure';
}

/**
 * A face's paths.
 * @param face The face
 * @param hunger Whether it's a Hunger die, whose critical has drips of blood in place of stars
 * @returns Its paths, each filled with fill-rule evenodd
 */
export function facePaths(face: Face, hunger: boolean): string[] {
	switch (face) {
		case 'failure':
			return FAILURE;
		case 'success':
			return SUCCESS;
		case 'critical':
			return hunger ? HUNGER_CRITICAL : CRITICAL;
		case 'bestial':
			return BESTIAL;
	}
}
