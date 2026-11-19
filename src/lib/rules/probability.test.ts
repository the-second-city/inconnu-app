import { expect, test } from 'vitest';

import { calculate, MAX_POOL, STRATEGIES, type Probabilities, type Strategy } from './probability';
import fixture from './probability.fixture.json';

/**
 * A roll and the bot's calculate() result for it, in Probabilities field order:
 * [pool, hunger, difficulty, strategy, [critical, success, messy, fail, totalFail,
 * bestial, totalSuccesses, margin]].
 *
 * Generated from inconnu/reference/probabilities.py, whose own tests check it
 * against real Roll objects. Covers every hunger, difficulty 0-9, and strategy for
 * pools 1-6, plus a sample of larger pools.
 */
type FixtureCase = [number, number, number, Strategy | null, number[]];

const OUTCOMES = ['critical', 'success', 'messy', 'fail', 'totalFail', 'bestial'] as const;

/** Put a Probabilities in the fixture's field order. */
function toRow(probs: Probabilities): number[] {
	return [...OUTCOMES.map((outcome) => probs[outcome]), probs.totalSuccesses, probs.margin];
}

test.each(fixture as FixtureCase[])(
	'calculate(%i, %i, %i, %s) matches the bot',
	(pool, hunger, difficulty, strategy, expected) => {
		const actual = toRow(calculate(pool, hunger, difficulty, strategy));
		actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 12));
	}
);

test.each([null, ...(Object.keys(STRATEGIES) as Strategy[])])(
	'outcomes sum to one for a large pool with strategy %s',
	(strategy) => {
		const probs = calculate(30, 5, 8, strategy);
		const total = OUTCOMES.reduce((sum, outcome) => sum + probs[outcome], 0);
		expect(total).toBeCloseTo(1, 12);
	}
);

test('hunger exceeding the pool is capped to the pool', () => {
	expect(calculate(2, 4, 1)).toEqual(calculate(2, 2, 1));
});

test('a pool below one is treated as one', () => {
	expect(calculate(0, 0, 1)).toEqual(calculate(1, 0, 1));
});

test.each([
	[MAX_POOL + 1, 0, 1],
	[5, 6, 1],
	[5, -1, 1],
	[5, 0, -1]
])('calculate(%i, %i, %i) rejects invalid parameters', (pool, hunger, difficulty) => {
	expect(() => calculate(pool, hunger, difficulty)).toThrow(RangeError);
});
