import { getErrorDetail } from '$lib';
import { error, fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { IntegrationKey, IntegrationKeys } from '$lib/types';
import { integrationError, integrationRequest, NO_STORE } from '$lib/server/integration';

async function authenticate(event: RequestEvent): Promise<string> {
	if (event.request.method === 'GET') event.setHeaders(NO_STORE);
	const session = await event.locals.auth();
	if (!session?.user?.id) error(401, 'Authentication required');
	return session.user.id;
}

async function form(event: RequestEvent, fields: string[]): Promise<URLSearchParams> {
	if (event.request.headers.get('origin') !== event.url.origin)
		error(403, 'Invalid request origin');
	if (
		event.request.headers.get('content-type')?.split(';')[0] !== 'application/x-www-form-urlencoded'
	) {
		error(400, 'Invalid form');
	}
	const reader = event.request.body?.getReader();
	if (!reader) error(400, 'Invalid form');
	const chunks: Uint8Array[] = [];
	let size = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > 4096) {
			await reader.cancel();
			error(413, 'Form is too large');
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.length;
	}
	const data = new URLSearchParams(new TextDecoder().decode(bytes));
	if ([...data.keys()].some((key) => !fields.includes(key) || data.getAll(key).length !== 1)) {
		error(400, 'Invalid form fields');
	}
	return data;
}

async function managementRequest(path: string, user: string, body?: unknown): Promise<Response> {
	try {
		return await integrationRequest(path, { user, body });
	} catch {
		error(503, integrationError(503));
	}
}

export const load: PageServerLoad = async (event) => {
	const user = await authenticate(event);
	const response = await managementRequest('/integration-keys', user);
	if (!response.ok)
		error(response.status, await getErrorDetail(response, integrationError(response.status)));
	return { ...((await response.json()) as IntegrationKeys), creation_id: crypto.randomUUID() };
};

export const actions: Actions = {
	create: async (event) => {
		event.setHeaders(NO_STORE);
		const user = await authenticate(event);
		const data = await form(event, [
			'name',
			'channel',
			'expires_in_days',
			'never_expires',
			'creation_id'
		]);
		const creationId = data.get('creation_id') ?? '';
		if (
			!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(creationId)
		) {
			return fail(400, { message: 'Reload this page before creating a key.' });
		}
		const name = data.get('name')?.trim() ?? '';
		const scope = /^([1-9]\d{0,19}):([1-9]\d{0,19})$/.exec(data.get('channel') ?? '');
		const days = data.get('expires_in_days') ?? '';
		const neverExpires = data.get('never_expires');
		const validExpiry =
			neverExpires === 'true'
				? !data.has('expires_in_days')
				: neverExpires === null && /^\d{1,2}$/.test(days) && +days >= 1 && +days <= 90;
		if (
			!name ||
			name.length > 64 ||
			!scope ||
			BigInt(scope[1]) > 18446744073709551615n ||
			BigInt(scope[2]) > 18446744073709551615n ||
			!validExpiry
		) {
			return fail(400, {
				message: 'Enter a name, choose an available channel and select an expiry.'
			});
		}
		const response = await managementRequest('/integration-keys', user, {
			name,
			guild_id: scope[1],
			channel_id: scope[2],
			expires_in_days: neverExpires === 'true' ? null : Number(days),
			creation_id: creationId
		});
		if (!response.ok)
			return fail(response.status, {
				message: await getErrorDetail(response, integrationError(response.status))
			});
		const result = (await response.json()) as { key: IntegrationKey; secret: string };
		return { secret: result.secret };
	},
	revoke: async (event) => {
		event.setHeaders(NO_STORE);
		const user = await authenticate(event);
		const data = await form(event, ['id']);
		const id = data.get('id') ?? '';
		if (!/^[a-f\d]{24}$/.test(id)) return fail(400, { message: 'Invalid API key.' });
		const response = await managementRequest(`/integration-keys/${id}/revoke`, user, {});
		if (!response.ok)
			return fail(response.status, {
				message: await getErrorDetail(response, integrationError(response.status))
			});
		return { message: 'API key revoked.' };
	}
};
