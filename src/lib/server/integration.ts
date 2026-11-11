import { API_KEY, INCONNU_API_URL } from '$env/static/private';

export const NO_STORE = { 'Cache-Control': 'no-store' };

export function integrationRequest(
	path: string,
	{ user, token, body }: { user?: string; token?: string; body?: unknown } = {}
): Promise<Response> {
	const headers = new Headers({ Authorization: `Bearer ${API_KEY}` });
	if (user) headers.set('X-Discord-User-ID', user);
	if (token) headers.set('X-Integration-Key', token);
	if (body !== undefined) headers.set('Content-Type', 'application/json');
	return fetch(`${INCONNU_API_URL}${path}`, {
		method: body === undefined ? 'GET' : 'POST',
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
		redirect: 'error',
		cache: 'no-store',
		signal: AbortSignal.timeout(15_000)
	});
}

export function integrationError(status: number): string {
	const messages: Record<number, string> = {
		400: 'Invalid request.',
		401: 'Authentication required or API key invalid.',
		403: 'You do not have permission to access this channel.',
		404: 'The requested key or channel was not found.',
		409: 'The request conflicts with the current API key state.',
		422: 'Check the submitted values.',
		429: 'Too many requests. Please try again later.'
	};
	return messages[status] ?? 'The integration service is unavailable. Please try again later.';
}
