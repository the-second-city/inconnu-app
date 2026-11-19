/**
 * Exact V5 roll outcome probabilities.
 *
 * Ported from the bot's inconnu/reference/probabilities.py. Rather than enumerate
 * 10^pool face combinations, we enumerate how many dice land in each category and
 * weight each by its multinomial probability.
 *
 * 1. Hunger states. Every hunger dice result, collapsed to (any ones?, successes,
 *    tens), since the number of ones doesn't matter.
 * 2. Normal grid. grid[tens][successes] holds the probability of each normal dice
 *    result. Failures are implied by the remaining dice.
 * 3. Rerolls. A strategy rerolls at most three normal dice, so each rerollable
 *    cell's probability is redistributed over the ways the rerolled dice can land.
 *    Hunger states that look the same to the reroll check share one grid.
 * 4. Scoring. For each hunger state, suffix sums over each tens row tell us in one
 *    lookup how much of the row meets the difficulty.
 */

export const MAX_POOL = 100;
export const MAX_HUNGER = 5;
const MAX_REROLL = 3;

// Category odds on a single die. Normal: failure (1-5), success (6-9), critical (10).
// Hunger: bestial (1), failure (2-5), success (6-9), critical (10).
const NORMAL_ODDS = [0.5, 0.4, 0.1];
const HUNGER_ODDS = [0.1, 0.4, 0.4, 0.1];

/** A Willpower reroll strategy, using the bot's identifiers. */
export type Strategy = 'reroll_failures' | 'maximize_criticals' | 'avoid_messy' | 'risky';

/** The display name of each strategy. */
export const STRATEGIES: Record<Strategy, string> = {
	reroll_failures: 'Re-roll Failures',
	maximize_criticals: 'Maximize Crits',
	avoid_messy: 'Avoid Messy Crits',
	risky: 'Risky Avoid Messy'
};

/** The probability of each roll outcome, plus average successes and margin. */
export interface Probabilities {
	critical: number;
	success: number;
	messy: number;
	fail: number;
	totalFail: number;
	bestial: number;
	totalSuccesses: number;
	margin: number;
}

/** A collapsed hunger dice result: any ones, successes (6-9), and tens. */
type HungerState = [bestial: boolean, succ: number, tens: number];

/** A grid of normal dice probabilities, indexed as grid[tens][successes]. */
type Grid = number[][];

/** Category counts (one per odds entry) and their probability. */
type Distribution = [counts: number[], prob: number][];

/**
 * Calculate the exact probability of each outcome, plus average successes and margin.
 *
 * Mirrors the bot's Roll: pool includes hunger, and the reroll strategy is applied
 * whenever the Roll's corresponding check would allow it.
 */
export function calculate(
	pool: number,
	hunger: number,
	difficulty: number,
	strategy: Strategy | null = null
): Probabilities {
	if (hunger < 0 || hunger > MAX_HUNGER) {
		throw new RangeError(`Hunger must be between 0 and ${MAX_HUNGER}. (Got ${hunger}.)`);
	}
	if (difficulty < 0) {
		throw new RangeError(`Difficulty cannot be less than 0. (Got ${difficulty}.)`);
	}
	pool = Math.max(1, pool);
	if (pool > MAX_POOL) {
		throw new RangeError(`Pool cannot exceed ${MAX_POOL}. (Got ${pool}.)`);
	}

	const normalCount = Math.max(0, pool - hunger);
	const hungerCount = Math.min(pool, hunger);

	// We only care whether hunger dice contain *any* ones, so we collapse those states
	const hungerStates = new Map<string, [HungerState, number]>();
	for (const [[ones, , succ, tens], prob] of distribution(hungerCount, HUNGER_ODDS)) {
		const state: HungerState = [ones > 0, succ, tens];
		const key = state.join();
		const existing = hungerStates.get(key);
		hungerStates.set(key, [state, (existing?.[1] ?? 0) + prob]);
	}

	// Reroll checks only see part of the hunger dice, so hunger states that look the
	// same to the check share a single post-reroll grid
	const groups = new Map<string, [HungerState, number][]>();
	for (const member of hungerStates.values()) {
		const key = groupKey(strategy, normalCount, member[0]);
		groups.set(key, [...(groups.get(key) ?? []), member]);
	}

	const base = normalGrid(normalCount);
	const probs: Probabilities = {
		critical: 0,
		success: 0,
		messy: 0,
		fail: 0,
		totalFail: 0,
		bestial: 0,
		totalSuccesses: 0,
		margin: 0
	};
	for (const members of groups.values()) {
		const grid =
			strategy === null ? base : postReroll(base, strategy, members[0][0], hungerCount, difficulty);
		score(probs, grid, members, difficulty);
	}

	probs.margin = probs.totalSuccesses - difficulty;
	return probs;
}

/** The number of ways to choose k items from n. */
function comb(n: number, k: number): number {
	let result = 1;
	for (let i = 1; i <= k; i++) {
		result = (result * (n - k + i)) / i;
	}
	return result;
}

/** Every way count dice can fall into the categories given by odds, with probabilities. */
function distribution(count: number, odds: number[]): Distribution {
	if (odds.length === 1) {
		return [[[count], odds[0] ** count]];
	}

	const states: Distribution = [];
	for (let first = 0; first <= count; first++) {
		const firstProb = comb(count, first) * odds[0] ** first;
		for (const [rest, restProb] of distribution(count - first, odds.slice(1))) {
			states.push([[first, ...rest], firstProb * restProb]);
		}
	}

	return states;
}

/**
 * The probability of each normal dice result, indexed as grid[tens][successes].
 *
 * Here, successes are 6-9 only. Failures are whatever dice remain.
 */
function normalGrid(count: number): Grid {
	const [failOdds, succOdds, tenOdds] = NORMAL_ODDS;
	const grid = emptyGrid(count);
	for (let tens = 0; tens <= count; tens++) {
		const tensProb = comb(count, tens) * tenOdds ** tens;
		for (let succ = 0; succ <= count - tens; succ++) {
			const fails = count - tens - succ;
			grid[tens][succ] = tensProb * comb(count - tens, succ) * succOdds ** succ * failOdds ** fails;
		}
	}

	return grid;
}

/** A (count + 1) x (count + 1) grid of zeroes. */
function emptyGrid(count: number): Grid {
	return Array.from({ length: count + 1 }, () => new Array<number>(count + 1).fill(0));
}

/** The part of a hunger state the strategy's reroll check depends on. */
function groupKey(strategy: Strategy | null, normalCount: number, state: HungerState): string {
	const [, hSucc, hTens] = state;

	switch (strategy) {
		case 'avoid_messy':
		case 'risky':
			// Messy crits are only avoidable with one hunger ten; success depends on hSucc
			return hTens === 1 ? `${hSucc},${hTens}` : '';
		case 'maximize_criticals':
			return normalCount === 1 ? String(hTens > 0) : '';
		default:
			return '';
	}
}

/** The normal dice grid after applying the strategy wherever the roll allows it. */
function postReroll(
	base: Grid,
	strategy: Strategy,
	state: HungerState,
	hungerCount: number,
	difficulty: number
): Grid {
	const count = base.length - 1;
	const rerolls = Array.from({ length: MAX_REROLL + 1 }, (_, k) => distribution(k, NORMAL_ODDS));

	// Rows that can't reroll are unchanged, so we only rebuild the ones that can
	const rows = rerollableRows(strategy, count);
	const grid = base.map((row) => [...row]);
	for (let tens = 0; tens < rows; tens++) {
		grid[tens].fill(0);
	}

	for (let tens = 0; tens < rows; tens++) {
		for (let succ = 0; succ <= count - tens; succ++) {
			const prob = base[tens][succ];
			const fails = count - tens - succ;

			if (!canReroll(strategy, fails, succ, tens, state, hungerCount, difficulty)) {
				grid[tens][succ] += prob;
				continue;
			}

			const [keptSucc, keptTens, rerolled] = reroll(strategy, fails, succ, tens);
			for (const [[, newSucc, newTens], rerollProb] of rerolls[rerolled]) {
				grid[keptTens + newTens][keptSucc + newSucc] += prob * rerollProb;
			}
		}
	}

	return grid;
}

/** How many rows (by normal tens, from zero) the strategy can possibly reroll. */
function rerollableRows(strategy: Strategy, count: number): number {
	switch (strategy) {
		case 'avoid_messy':
		case 'risky':
			// Avoiding a messy critical requires no more than three normal tens
			return Math.min(count, MAX_REROLL) + 1;
		default:
			return count + 1;
	}
}

/** Add each hunger state's outcomes, given the normal dice grid it's rolled with. */
function score(
	probs: Probabilities,
	grid: Grid,
	members: [HungerState, number][],
	difficulty: number
) {
	const count = grid.length - 1;

	// tails[tens][succ] is the probability of that many tens and at least succ successes
	const tails: number[][] = [];
	let avgSucc = 0;
	for (const row of grid) {
		const tail = new Array<number>(count + 2).fill(0);
		for (let succ = count; succ >= 0; succ--) {
			tail[succ] = tail[succ + 1] + row[succ];
			avgSucc += succ * row[succ];
		}
		tails.push(tail);
	}

	const target = Math.max(difficulty, 1);
	for (const [[bestial, hSucc, hTens], hungerProb] of members) {
		let avgTotal = avgSucc;
		tails.forEach((tail, tens) => {
			const mass = tail[0];
			if (mass === 0) return;

			// Successes from everything except normal 6-9s
			const allTens = tens + hTens;
			const other = hSucc + 2 * allTens - (allTens % 2);
			avgTotal += mass * other;

			const needed = target - other;
			const hit = needed <= 0 ? mass : tail[Math.min(needed, count + 1)];
			const miss = mass - hit;

			if (allTens < 2) {
				probs.success += hungerProb * hit;
			} else if (hTens > 0) {
				probs.messy += hungerProb * hit;
			} else {
				probs.critical += hungerProb * hit;
			}

			if (bestial) {
				probs.bestial += hungerProb * miss;
			} else if (other === 0) {
				// No successes at all is only possible without normal 6-9s
				const zero = grid[tens][0];
				probs.totalFail += hungerProb * zero;
				probs.fail += hungerProb * (miss - zero);
			} else {
				probs.fail += hungerProb * miss;
			}
		});

		probs.totalSuccesses += hungerProb * avgTotal;
	}
}

/** Whether the strategy can be applied. Mirrors Roll's can_* properties. */
function canReroll(
	strategy: Strategy,
	fails: number,
	succ: number,
	tens: number,
	[, hSucc, hTens]: HungerState,
	hungerCount: number,
	difficulty: number
): boolean {
	const normalCount = fails + succ + tens;

	switch (strategy) {
		case 'reroll_failures':
			return fails > 0;
		case 'maximize_criticals':
			if (normalCount + hungerCount < 2) return false;
			if (normalCount === 1) return tens === 0 && hTens > 0;
			return tens !== normalCount;
		case 'avoid_messy':
			return canAvoidMessy(succ, tens, hSucc, hTens, difficulty);
		case 'risky':
			return fails > 0 && canAvoidMessy(succ, tens, hSucc, hTens, difficulty);
	}
}

/** Total successes, counting each pair of tens as four. */
function totalSuccesses(succ: number, tens: number, hSucc: number, hTens: number): number {
	const allTens = tens + hTens;
	return succ + hSucc + 2 * allTens - (allTens % 2);
}

/** Whether the roll is a messy critical with exactly one hunger ten and few normal tens. */
function canAvoidMessy(
	succ: number,
	tens: number,
	hSucc: number,
	hTens: number,
	difficulty: number
): boolean {
	const total = totalSuccesses(succ, tens, hSucc, hTens);
	const messy = tens + hTens >= 2 && hTens > 0 && total >= difficulty && total > 0;
	return messy && hTens === 1 && tens <= 3;
}

/**
 * Apply a strategy to normal dice. Returns kept successes, kept tens, and dice rerolled.
 *
 * Mirrors the reroll helpers in the bot's inconnu.roll.roll.
 */
function reroll(
	strategy: Strategy,
	fails: number,
	succ: number,
	tens: number
): [keptSucc: number, keptTens: number, rerolled: number] {
	switch (strategy) {
		case 'reroll_failures':
			return [succ, tens, Math.min(fails, MAX_REROLL)];
		case 'maximize_criticals': {
			const rerolledFails = Math.min(fails, MAX_REROLL);
			const rerolledSucc = Math.min(succ, MAX_REROLL - rerolledFails);
			return [succ - rerolledSucc, tens, rerolledFails + rerolledSucc];
		}
		case 'avoid_messy': {
			const rerolledTens = Math.min(tens, MAX_REROLL);
			return [succ, tens - rerolledTens, rerolledTens];
		}
		case 'risky': {
			// All tens (at most three, per canAvoidMessy) plus failures to make three
			const rerolledFails = Math.min(fails, MAX_REROLL - tens);
			return [succ, 0, tens + rerolledFails];
		}
	}
}
