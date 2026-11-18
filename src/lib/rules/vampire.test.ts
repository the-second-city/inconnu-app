import { expect, test } from 'vitest';

import { bloodPotency, isVampiric } from './vampire';

test.each([
	['vampire', true],
	['thin-blood', true],
	['ghoul', false],
	['mortal', false]
])('a %s is vampiric: %s', (splat, vampiric) => {
	expect(isVampiric(splat)).toBe(vampiric);
});

test.each([
	[{ potency: 3, blood_potency: 1 }, 3],
	[{ blood_potency: 2 }, 2],
	[{}, 0]
])('Blood Potency prefers `potency`, then `blood_potency`, else 0: %o', (char, potency) => {
	expect(bloodPotency(char)).toBe(potency);
});
