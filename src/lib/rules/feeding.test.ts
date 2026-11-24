import { expect, test } from 'vitest';

import { animalBloodNote, feedingCost, feedingLimits } from '$lib/rules/feeding';

test.each([
	// [potency, reduction, harmless, beforeDrain, drainFloor]
	[0, 0, 2, 4, 1],
	[1, 0, 2, 4, 1],
	[2, 0, 2, 4, 1],
	[3, 0, 2, 4, 1],
	[4, 1, 1, 3, 1],
	[5, 1, 1, 3, 2],
	[6, 2, 0, 2, 2],
	[7, 2, 0, 2, 2],
	[8, 2, 0, 2, 3], // BP 8 shares 9's row: drain to go below Hunger 3
	[9, 2, 0, 2, 3],
	[10, 3, 0, 1, 3]
])(
	'at Blood Potency %i: %i less, %i harmless, %i before a drain, drain below %i',
	(potency, reduction, harmless, beforeDrain, drainFloor) => {
		expect(feedingLimits(potency)).toEqual({ reduction, harmless, beforeDrain, drainFloor });
	}
);

test.each([
	// [potency, hunger, amount, cost]
	[1, 5, 1, 'harmless'],
	[1, 5, 2, 'harmless'],
	[1, 5, 3, 'harmful'],
	[1, 5, 4, 'harmful'],
	[1, 5, 5, 'drain'], // To 0
	[1, 2, 2, 'drain'], // To 0, though only 2
	[4, 5, 1, 'harmless'],
	[4, 5, 2, 'harmful'],
	[4, 5, 3, 'harmful'],
	[4, 5, 4, 'drain'], // More than 3
	[5, 3, 2, 'drain'], // Below 2
	[6, 5, 1, 'harmful'], // No drink is harmless
	[6, 5, 3, 'drain'],
	[9, 4, 2, 'drain'], // Below 3
	[10, 5, 1, 'harmful'],
	[10, 5, 2, 'drain']
] as const)(
	'at Blood Potency %i and Hunger %i, slaking %i is %s',
	(potency, hunger, amount, cost) => {
		expect(feedingCost(potency, hunger, amount)).toBe(cost);
	}
);

test.each([
	[0, null],
	[1, null],
	[2, 'Animal and bagged blood slakes only half Hunger.'],
	[3, 'Animal and bagged blood slakes no Hunger.'],
	[10, 'Animal and bagged blood slakes no Hunger.']
])('at Blood Potency %i, animal and bagged blood: %s', (potency, note) => {
	expect(animalBloodNote(potency)).toBe(note);
});
