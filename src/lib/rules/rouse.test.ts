import { expect, test } from 'vitest';

import { hungerRiseChance, percent } from '$lib/rules/rouse';

test.each([
	// [count, reroll, chance]
	[1, false, '50%'],
	[2, false, '75%'],
	[3, false, '88%'],
	[1, true, '25%'],
	[2, true, '44%'],
	[3, true, '58%']
])('%i checks (re-rolling: %s) raise Hunger %s of the time', (count, reroll, chance) => {
	expect(percent(hungerRiseChance(count, reroll))).toBe(chance);
});
