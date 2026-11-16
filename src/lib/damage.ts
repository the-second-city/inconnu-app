/**
 * Damage tracks (`.` healthy, `/` Superficial, `x` Aggravated, stored healthy first), with damage
 * applied as the bot's `VChar.set_damage(..., wrap=True)` does, so a preview matches what the bot
 * will save.
 */

/** A track of a length with these amounts of damage, as the bot builds it: healthy first, keeping
 * the rightmost boxes when the damage outgrows the track (so Aggravated outlasts Superficial). */
const build = (length: number, superficial: number, aggravated: number): string =>
	(
		'.'.repeat(Math.max(0, length - superficial - aggravated)) +
		'/'.repeat(superficial) +
		'x'.repeat(aggravated)
	).slice(-length);

/** How many boxes of a kind a track has. */
export const countBoxes = (track: string, kind: string): number =>
	[...track].filter((box) => box === kind).length;

/**
 * A track after taking damage. Superficial applies first: it fills healthy boxes, and once there are
 * none, each extra point adds an Aggravated box instead (so it keeps wrapping until the track is all
 * Aggravated). Then Aggravated: it fills healthy boxes, then replaces Superficial ones. This order
 * means each point of either adds exactly one box of its kind, even on a wrapped track; the other
 * order lets an Aggravated point take a healthy box the Superficial would have filled, making it
 * wrap once more. The bot's endpoint must apply them in the same order.
 */
export const takeDamage = (track: string, superficial: number, aggravated: number): string => {
	const length = track.length;
	let sup = countBoxes(track, '/');
	let agg = countBoxes(track, 'x');

	// Superficial (wraps into Aggravated)
	sup += superficial;
	const overflow = sup + agg - length;
	if (overflow > 0) agg += overflow;
	const afterSuperficial = build(length, sup, agg);
	sup = countBoxes(afterSuperficial, '/');
	agg = countBoxes(afterSuperficial, 'x');

	// Aggravated (no wrap): the build drops Superficial boxes it crowds out
	agg += aggravated;
	return build(length, sup, agg);
};
