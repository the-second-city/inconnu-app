import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';

/**
 * Relay a character's live-update stream (Server-Sent Events) from the Inconnu API.
 *
 * The events say only that the character changed (`changed`) or is gone (`deleted`), so the API
 * lets any member of the character's guild listen. The page then reruns its loader, which checks
 * the viewer's access to the character itself.
 *
 * A viewer who can never listen (signed out, or the API says no such character or no access) gets
 * a `gone` message instead of an error status. EventSource can't see a status, so the page couldn't
 * otherwise tell this from the API being down, and would only retry quietly. On `gone`, it reruns
 * its loader, which shows the real reason (sign-in, 404, …).
 *
 * When the browser disconnects, SvelteKit cancels the relayed body, which closes the upstream
 * connection. The API's heartbeat makes sure a dead connection is noticed.
 */
export const GET: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return gone();
	}

	let upstream: Response;
	try {
		upstream = await fetch(
			`${INCONNU_API_URL}/characters/${encodeURIComponent(params.id)}/events`,
			{
				headers: {
					Accept: 'text/event-stream',
					Authorization: `Bearer ${API_KEY}`,
					'X-Discord-User-ID': session.user.id
				},
				signal: request.signal
			}
		);
	} catch (err) {
		// The browser left (the tab was hidden, say) before the API answered: not an outage
		if (!request.signal.aborted) console.error('Events: no connection to the Inconnu API;', err);
		error(502, 'Live updates are unavailable right now.');
	}

	if (upstream.status === 403 || upstream.status === 404) {
		await upstream.body?.cancel();
		return gone();
	}

	// Anything but an event stream is the API's (or our) fault, not the viewer's: a 401 means a bad
	// API key, and a 200 that isn't a stream means a wrong URL. Only the API's own errors (say, 503
	// while the bot starts) keep their status.
	const isStream = upstream.headers.get('Content-Type')?.startsWith('text/event-stream');
	if (!upstream.ok || !upstream.body || !isStream) {
		await upstream.body?.cancel();
		if (upstream.status < 500) {
			console.error(
				`Events: unexpected response from the Inconnu API (${upstream.status}, ${upstream.headers.get('Content-Type')})`
			);
		}
		error(
			upstream.status >= 500 ? upstream.status : 502,
			'Live updates are unavailable right now.'
		);
	}

	// Rebuilt, so the API's own headers never reach the browser
	return new Response(upstream.body, { headers: SSE_HEADERS });
};

/** Event-stream headers. `X-Accel-Buffering` keeps a proxy in front of the app (should one appear)
 * from buffering the stream. */
const SSE_HEADERS = {
	'Content-Type': 'text/event-stream',
	'Cache-Control': 'no-cache',
	'X-Accel-Buffering': 'no'
};

/** A stream that tells the page to stop listening, as it never can. */
const gone = (): Response => new Response('data: gone\n\n', { headers: SSE_HEADERS });
