/**
 * Feeding rules by Blood Potency (V5's Blood Potency table), for warning what a slake from a human
 * costs. They assume a single victim, as the game does, and apply to thin-bloods the same way.
 */

/** What feeding from one human allows at a Blood Potency. */
export interface FeedingLimits {
	reduction: number; // How much less Hunger each human slakes
	harmless: number; // The most Hunger slaked without harming the victim
	beforeDrain: number; // The most Hunger slaked without draining (killing) the victim
	drainFloor: number; // Taking Hunger below this requires draining (killing) a human
}

/** The feeding limits at a Blood Potency. */
export const feedingLimits = (potency: number): FeedingLimits => {
	const reduction = potency >= 10 ? 3 : potency >= 6 ? 2 : potency >= 4 ? 1 : 0;
	return {
		reduction,
		// Normally 2 before the drink harms the victim, and 4 before it kills; high Blood Potency
		// slakes less per human, down to no harmless drink at all
		harmless: Math.max(0, 2 - reduction),
		beforeDrain: 4 - reduction,
		drainFloor: potency >= 8 ? 3 : potency >= 5 ? 2 : 1
	};
};

/** What slaking an amount of Hunger from one human costs the victim. */
export type FeedingCost = 'harmless' | 'harmful' | 'drain';

/**
 * What slaking an amount from one human costs: a drain (the victim dies) when it's more than a
 * drink allows, or would take Hunger below the drain floor; otherwise harmful past the harmless
 * amount.
 */
export const feedingCost = (potency: number, hunger: number, amount: number): FeedingCost => {
	const limits = feedingLimits(potency);
	if (amount > limits.beforeDrain || hunger - amount < limits.drainFloor) return 'drain';
	if (amount > limits.harmless) return 'harmful';
	return 'harmless';
};

/** What animal and bagged blood slakes at a Blood Potency, or null when it's unaffected. */
export const animalBloodNote = (potency: number): string | null => {
	if (potency >= 3) return 'Animal and bagged blood slakes no Hunger.';
	if (potency === 2) return 'Animal and bagged blood slakes only half Hunger.';
	return null;
};
