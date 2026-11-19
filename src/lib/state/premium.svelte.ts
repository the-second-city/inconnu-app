/**
 * Premium status. Editing characters and the tracker actions (Rouse, Mend, Take Damage, Slake,
 * Stains, Remorse) are for supporters. The Inconnu API enforces it, refusing non-supporters with a
 * 403; the character page also asks first, so non-supporters see the upsell before they start.
 */

import { resolve } from '$app/paths';

/** The API's `detail` when it refuses a non-supporter. */
export const SUPPORTERS_ONLY = 'This feature is for supporters only';

/** The upsell: whether it's open, and the feature it names (e.g. "Editing characters"). The
 * character page shows it. Only clicks open it, so the server never writes it. */
export const upsell = $state({ open: false, feature: '' });

/** Open the upsell, naming the feature that was refused. */
export const showUpsell = (feature: string): void => {
	upsell.feature = feature;
	upsell.open = true;
};

/** Whether a response (its status and JSON body, null if none) is the API refusing a
 * non-supporter. */
export const refusedForPremium = (status: number, json: unknown): boolean =>
	status === 403 && (json as { detail?: unknown } | null)?.detail === SUPPORTERS_ONLY;

/** Whether the API's answer to the premium check is `{ is_supporter: true }`. */
const saysSupporter = (json: unknown): boolean =>
	(json as { is_supporter?: unknown } | null)?.is_supporter === true;

/**
 * Whether the signed-in viewer is a supporter. When the check itself fails (an unreachable API, an
 * ended session), it answers true: the API still refuses non-supporters, which opens the upsell
 * then, so a hiccup shouldn't show a supporter the upsell.
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
