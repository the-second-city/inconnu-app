import { error, json } from '@sveltejs/kit';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { relay, type RelayOptions } from '$lib/server/relay';

/** A character route's endpoint on the Inconnu API, and what its errors say. */
export interface CharacterRelayOptions extends RelayOptions {
	method: 'POST' | 'PATCH' | 'DELETE'; // A DELETE has no body
	// The path after `/characters/{id}/` (e.g. "rouse"), or null for none; or a function of the
	// route's params, for a path with more of them (its values encoded)
	action: string | null | ((params: Record<string, string>) => string);
	signIn: string; // The 401's message for a viewer without a session, e.g. "Sign in to Rouse."
}

/** The parts of a request event a character route reads. */
interface CharacterRequest {
	locals: App.Locals;
	params: { id: string } & Record<string, string>;
	request: Request;
}

/**
 * A handler that relays the browser's JSON body (none, for a DELETE) to the Inconnu API's
 * `/characters/{id}[/action]` as the signed-in viewer, whom the API checks may act on the
 * character. Invalid JSON is a 400, and only a viewer without a session gets a 401. See `relay` for
 * what becomes a 502.
 */
export const characterRelay =
	({ method, action, signIn, label, unavailable }: CharacterRelayOptions) =>
	async ({ locals, params, request }: CharacterRequest): Promise<Response> => {
		const session = await locals.auth();
		if (!session?.user?.id) {
			return json({ message: signIn }, { status: 401 });
		}

		const headers: Record<string, string> = {
			Authorization: `Bearer ${API_KEY}`,
			'X-Discord-User-ID': session.user.id
		};
		let body: string | undefined;
		if (method !== 'DELETE') {
			const payload = await request.json().catch(() => error(400, 'Invalid JSON'));
			headers['Content-Type'] = 'application/json';
			body = JSON.stringify(payload);
		}

		const rest = typeof action === 'function' ? action(params) : action;
		const path = `/characters/${encodeURIComponent(params.id)}${rest ? `/${rest}` : ''}`;
		return relay(`${INCONNU_API_URL}${path}`, { method, headers, body }, { label, unavailable });
	};
