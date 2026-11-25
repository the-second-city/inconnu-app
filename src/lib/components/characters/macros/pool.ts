/**
 * What the macro form's strip and Pool section share: the empty pool's hint, the modifier, and the
 * traits the character lacks.
 */

import { plural } from '$lib';
import type { PoolTerm } from '$lib/rules/macros';
import type { PoolPicker } from '$lib/state/poolPicker.svelte';

/** What the pool says while it's empty. */
export const POOL_HINT = 'Click traits on the sheet to build the pool.';

/** The modifier's bound either way. The bot sets none; this keeps the stepper sensible. */
export const MODIFIER_LIMIT = 10;

/** The modifier's least: it can only subtract from a trait being added, or stay where it is. */
export const modifierMin = (picker: PoolPicker): number =>
	picker.addsTrait || picker.modifier < 0 ? -MODIFIER_LIMIT : 0;

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
