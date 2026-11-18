/** Whether a splat has Blood Potency and Hunger: vampires and thin-bloods. */
export const isVampiric = (splat: string): boolean => splat === 'vampire' || splat === 'thin-blood';

/** A character's Blood Potency. The API sends `potency`; `blood_potency` is the wizard's name. */
export const bloodPotency = (char: { potency?: number; blood_potency?: number }): number =>
	char.potency ?? char.blood_potency ?? 0;
