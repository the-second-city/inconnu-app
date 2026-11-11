import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { integrationError, integrationRequest, NO_STORE } from '$lib/server/integration';

export const GET: RequestHandler = async ({ request, url }) => {
	const reject = (status: number) =>
		json({ detail: integrationError(status) }, { status, headers: NO_STORE });
	const bearer = /^[Bb][Ee][Aa][Rr][Ee][Rr] (ink_[a-f0-9]{24}_[A-Za-z0-9_-]{43})$/.exec(
		request.headers.get('authorization') ?? ''
	);
	if (!bearer) return reject(401);
	const query = url.searchParams;
	if (
		[...query.keys()].some(
			(key) => !['start', 'end', 'cursor', 'limit'].includes(key) || query.getAll(key).length !== 1
		)
	) {
		return reject(400);
	}
	const start = query.get('start') ?? '';
	const end = query.get('end') ?? '';
	const utc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;
	const duration = Date.parse(end) - Date.parse(start);
	const limit = query.get('limit') ?? '100';
	if (
		!utc.test(start) ||
		!utc.test(end) ||
		!Number.isFinite(duration) ||
		duration <= 0 ||
		duration > 86_400_000 ||
		!/^\d{1,3}$/.test(limit) ||
		+limit < 1 ||
		+limit > 100
	) {
		return reject(400);
	}
	const cursor = query.get('cursor');
	if (cursor !== null && !/^[A-Za-z0-9_.=-]{1,512}$/.test(cursor)) return reject(400);
	try {
		const upstream = await integrationRequest(`/integration-rolls?${query}`, { token: bearer[1] });
		if (!upstream.ok) {
			const status = [400, 401, 403, 404, 422, 429, 503].includes(upstream.status)
				? upstream.status
				: 503;
			const headers = new Headers(NO_STORE);
			const retry = upstream.headers.get('retry-after');
			if (retry && /^\d{1,6}$/.test(retry)) headers.set('Retry-After', retry);
			return json({ detail: integrationError(status) }, { status, headers });
		}
		return json(await upstream.json(), { headers: NO_STORE });
	} catch {
		return reject(503);
	}
};
