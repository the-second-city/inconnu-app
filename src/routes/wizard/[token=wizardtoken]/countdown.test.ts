import { expect, test } from 'vitest';

import { formatTimeLeft, timeLeft, urgency } from './countdown';

test.each([
	[30 * 60_000, '30:00'],
	[61_000, '1:01'],
	[59_001, '1:00'],
	[9_000, '0:09'],
	[1, '0:01'],
	[0, '0:00'],
	[65 * 60_000, '1:05:00']
])('%i ms left reads %s', (ms, text) => {
	expect(formatTimeLeft(ms)).toBe(text);
});

test('time left never goes below 0', () => {
	expect(timeLeft(1000, 5000)).toBe(0);
	expect(timeLeft(5000, 1000)).toBe(4000);
});

test.each([
	[10 * 60_000, 'calm'],
	[5 * 60_000, 'calm'],
	[5 * 60_000 - 1, 'warning'],
	[60_000, 'warning'],
	[59_999, 'error'],
	[0, 'error']
] as const)('%i ms left is %s', (ms, level) => {
	expect(urgency(ms)).toBe(level);
});
