/** Remorse tests, as the bot's `/remorse` rolls them (`remorse_roll`). */

/** A character's Bane Severity at a Blood Potency: none at 0, else half (rounded up) plus 1. */
export const baneSeverity = (potency: number): number =>
	potency === 0 ? 0 : Math.ceil(potency / 2) + 1;

/**
 * How many dice a Remorse test rolls: one per Humanity box neither filled nor Stained, but at
 * least `minimum`. The Lasombra alternative Bane takes Bane Severity fewer, leaving at least one.
 */
export const remorseDice = (
	humanity: number,
	stains: number,
	{ minimum = 1, lasombraBane = null }: { minimum?: number; lasombraBane?: number | null } = {}
): number => {
	const dice = Math.max(10 - humanity - stains, minimum);
	return lasombraBane === null ? dice : Math.max(1, dice - lasombraBane);
};
