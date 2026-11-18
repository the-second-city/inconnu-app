/**
 * Premium status. Editing characters and the tracker actions (Rouse, Mend, Take Damage, Slake,
 * Stains, Remorse) are for supporters; the Inconnu API enforces it, and the character page asks
 * first, so non-supporters see an upsell rather than an error.
 */

import { resolve } from '$app/paths';

/** Whether the API's answer to the premium check is `{ is_supporter: true }`. */
const saysSupporter = (json: unknown): boolean =>
	(json as { is_supporter?: unknown } | null)?.is_supporter === true;

/**
 * Whether the signed-in viewer is a supporter. When the check itself fails (an unreachable API, an
 * ended session), it answers true: the API still refuses non-supporters, and its error says why,
 * so a hiccup shouldn't show a supporter the upsell.
 */
export const isSupporter = async (): Promise<boolean> => {
	try {
		const response = await fetch(resolve('/api/users/check-premium'));
		if (!response.ok) return true;
		return saysSupporter(await response.json());
	} catch {
		return true;
	}
};
