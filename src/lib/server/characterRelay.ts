import { error, json } from '@sveltejs/kit';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { relay, type RelayOptions } from '$lib/server/relay';

/** A character route's endpoint on the Inconnu API, and what its errors say. */
export interface CharacterRelayOptions extends RelayOptions {
	method: 'POST' | 'PATCH';
	action: string | null; // The path after `/characters/{id}/` (e.g. "rouse"), or null for none
	signIn: string; // The 401's message for a viewer without a session, e.g. "Sign in to Rouse."
}

/** The parts of a request event a character route reads. */
interface CharacterRequest {
	locals: App.Locals;
	params: { id: string };
	request: Request;
}

/**
 * A handler that relays the browser's JSON body to the Inconnu API's `/characters/{id}[/action]`
 * as the signed-in viewer, whom the API checks may act on the character. Invalid JSON is a 400,
 * and only a viewer without a session gets a 401. See `relay` for what becomes a 502.
 */
export const characterRelay =
	({ method, action, signIn, label, unavailable }: CharacterRelayOptions) =>
	async ({ locals, params, request }: CharacterRequest): Promise<Response> => {
		const session = await locals.auth();
		if (!session?.user?.id) {
			return json({ message: signIn }, { status: 401 });
		}

		const payload = await request.json().catch(() => error(400, 'Invalid JSON'));
		const path = `/characters/${encodeURIComponent(params.id)}${action ? `/${action}` : ''}`;
		return relay(
			`${INCONNU_API_URL}${path}`,
			{
				method,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${API_KEY}`,
					'X-Discord-User-ID': session.user.id
				},
				body: JSON.stringify(payload)
			},
			{ label, unavailable }
		);
	};
