import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import type { Constraints } from '$lib/types';

// They only change when the bot does, but the character page's loader reruns on every live
// update, so fetch them at most this often, keeping the last good copy if the API is down
const RECHECK_MS = 5 * 60_000;
// After a failed refresh, keep serving the last good copy this long before trying again, so an
// outage doesn't cost every page load a request
const RETRY_MS = 30_000;
// A hanging API shouldn't hold up the page for longer than this
const TIMEOUT_MS = 10_000;

let cached: Constraints | null = null;
let checkAfter = 0; // When the cached copy is next refreshed
let pending: Promise<Constraints> | null = null;

/** Fetch the constraints from the Inconnu API, throwing if it can't answer. */
const refresh = async (): Promise<Constraints> => {
	const response = await fetch(`${INCONNU_API_URL}/constraints`, {
		headers: { Authorization: `Bearer ${API_KEY}` },
		signal: AbortSignal.timeout(TIMEOUT_MS)
	});
	if (!response.ok) throw new Error(`GET /constraints: ${response.status}`);
	return (await response.json()) as Constraints;
};

/**
 * The bot's validation constraints, which edit mode checks input against. Cached for a few
 * minutes; past that, refetched, falling back to the last good copy (retried after a short wait).
 * Throws only if there's none, in which case the next call tries again.
 */
export const getConstraints = async (): Promise<Constraints> => {
	if (cached && Date.now() < checkAfter) return cached;
	pending ??= refresh()
		.then((constraints) => {
			cached = constraints;
			checkAfter = Date.now() + RECHECK_MS;
			return constraints;
		})
		.catch((err) => {
			if (!cached) throw err;
			checkAfter = Date.now() + RETRY_MS;
			console.error('Constraints: keeping the last good copy;', err);
			return cached;
		})
		.finally(() => {
			pending = null;
		});
	return pending;
};
