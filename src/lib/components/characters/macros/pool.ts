/**
 * What the macro form's strip and Pool section share: the empty pool's hint, the modifier, and the
 * traits the character lacks.
 */

import { andList, plural } from '$lib';
import { KEY_DELIMITER, type PoolTerm } from '$lib/rules/macros';
import type { PoolPicker, Repeat } from '$lib/state/poolPicker.svelte';
import type { Constraints } from '$lib/types';

/** What the pool says while it's empty. */
export const POOL_HINT = 'Click traits on the sheet to build the pool.';

/** The modifier's stepper goes this far either way, a sensible bound, within the bot's `pool_max`. */
export const modifierLimit = (constraints: Constraints): number =>
	Math.min(10, constraints.pool_max);

/** The modifier's least: it can only subtract from a trait being added, or stay where it is. */
export const modifierMin = (picker: PoolPicker, limit: number): number =>
	picker.addsTrait || picker.modifier < 0 ? -limit : 0;

/**
 * Why the bot won't take a pool's size, or null: more tokens than `macro_pool_max_tokens`, or a
 * number past `pool_max` (a macro from Discord's numbers, combined).
 */
export const poolSizeError = (
	tokens: string[],
	modifier: number,
	constraints: Constraints
): string | null => {
	if (tokens.length > constraints.macro_pool_max_tokens) {
		const terms = Math.floor((constraints.macro_pool_max_tokens + 1) / 2);
		return `A pool can have at most ${terms} traits and numbers.`;
	}
	if (Math.abs(modifier) > constraints.pool_max) {
		return `The modifier can't be more than ${constraints.pool_max}.`;
	}
	return null;
};

/** What the modifier does: "Adds 2 dice", "Subtracts 1 die". */
export const modifierDetail = (value: number): string =>
	value === 0
		? 'Dice beyond the traits'
		: `${value > 0 ? 'Adds' : 'Subtracts'} ${plural(Math.abs(value), 'die', 'dice')}`;

/** The modifier as the strip shows it: "+2", "−1", "±0". */
export const formatModifier = (value: number): string =>
	value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '±0';

/** The traits a resolved pool's terms lack (or lack a specialty of), to mark their chips. */
export const missingTraits = (terms: PoolTerm[]): string[] =>
	terms.filter((term) => term.missing !== null).map((term) => term.name);

/** What saving does about a trait the macro's pool has more than once. */
export const repeatNote = ({ trait, kept, dropped, conflict }: Repeat): string => {
	const named = (specialty: string): string =>
		`${trait} (${specialty.split(KEY_DELIMITER).join(', ')})`;
	if (conflict)
		return `${trait} is both added and subtracted in this pool. Flip or remove it to save.`;
	const keeps = kept === null ? 'one' : named(kept);
	const drops = dropped.length > 0 ? ` and drops ${andList(dropped.map(named))}` : '';
	return `${trait} is in this pool more than once. Saving keeps ${keeps}${drops}.`;
};
