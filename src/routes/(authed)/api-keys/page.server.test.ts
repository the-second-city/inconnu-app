import { beforeEach, expect, test, vi } from 'vitest';
import type { RequestEvent } from './$types';
import { actions, load } from './+page.server';

vi.mock('$env/static/private', () => ({
	API_KEY: 'website-only',
	INCONNU_API_URL: 'https://private.test'
}));

const fetchMock = vi.fn();
const user = '123456';
const id = '0123456789abcdef01234567';
const creationId = 'ed00a680-4bb1-4c32-9705-63bb764b3792';

function event(
	values: Record<string, string> = {},
	authenticated = true,
	origin = 'https://inconnu.test'
) {
	return {
		locals: { auth: vi.fn().mockResolvedValue(authenticated ? { user: { id: user } } : null) },
		setHeaders: vi.fn(),
		url: new URL('https://inconnu.test/api-keys'),
		request: new Request('https://inconnu.test/api-keys', {
			method: 'POST',
			headers: { Origin: origin },
			body: new URLSearchParams(values)
		})
	} as unknown as RequestEvent;
}

function createEvent(values: Record<string, string> = {}) {
	return event({ creation_id: creationId, ...values });
}

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock);
	fetchMock.mockReset();
});

test('loads owner metadata with private service authentication and no-store', async () => {
	fetchMock.mockResolvedValue(Response.json({ keys: [], channels: [] }));
	const request = event();
	request.request = new Request(request.url);
	expect(await load(request as Parameters<typeof load>[0])).toEqual({
		keys: [],
		channels: [],
		creation_id: expect.stringMatching(/^[a-f0-9-]{36}$/)
	});
	expect(request.setHeaders).toHaveBeenCalledWith({ 'Cache-Control': 'no-store' });
	const [url, options] = fetchMock.mock.calls[0];
	expect(url).toBe('https://private.test/integration-keys');
	expect(options.headers.get('Authorization')).toBe('Bearer website-only');
	expect(options.headers.get('X-Discord-User-ID')).toBe(user);
	expect(options.redirect).toBe('error');
});

test.each(['create', 'revoke'] as const)(
	'%s authenticates independently of layout',
	async (action) => {
		await expect(actions[action](event({}, false))).rejects.toMatchObject({ status: 401 });
		expect(fetchMock).not.toHaveBeenCalled();
	}
);

test.each(['create', 'revoke'] as const)('%s rejects a foreign origin', async (action) => {
	await expect(actions[action](event({}, true, 'https://evil.test'))).rejects.toMatchObject({
		status: 403
	});
	expect(fetchMock).not.toHaveBeenCalled();
});

test('creates a fixed-scope key and returns only the one-time secret', async () => {
	fetchMock.mockResolvedValue(
		Response.json({ key: { id }, secret: 'one-time-secret' }, { status: 201 })
	);
	const result = await actions.create(
		createEvent({ name: ' Example ', channel: '123:456', expires_in_days: '90' })
	);
	expect(result).toEqual({ secret: 'one-time-secret' });
	expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
		name: 'Example',
		guild_id: '123',
		channel_id: '456',
		expires_in_days: 90,
		creation_id: creationId
	});
});

test.each([
	{ name: '', channel: '123:456', expires_in_days: '90' },
	{ name: 'x'.repeat(65), channel: '123:456', expires_in_days: '90' },
	{ name: 'Key', channel: '123:456', expires_in_days: '91' },
	{ name: 'Key', channel: '123:456', expires_in_days: '0' },
	{ name: 'Key', channel: '../anything', expires_in_days: '90' }
])('rejects invalid creation values %o', async (values) => {
	expect(await actions.create(createEvent(values))).toMatchObject({ status: 400 });
	expect(fetchMock).not.toHaveBeenCalled();
});

test('revoke forwards the authenticated owner to the revoke endpoint', async () => {
	fetchMock.mockResolvedValue(Response.json({ key: { id } }));
	expect(await actions.revoke(event({ id }))).toEqual({ message: 'API key revoked.' });
	expect(fetchMock.mock.calls[0][0]).toBe(`https://private.test/integration-keys/${id}/revoke`);
	expect(fetchMock.mock.calls[0][1].headers.get('X-Discord-User-ID')).toBe(user);
});

test('rejects key path traversal', async () => {
	expect(await actions.revoke(event({ id: '../other' }))).toMatchObject({ status: 400 });
	expect(fetchMock).not.toHaveBeenCalled();
});

test('does not expose upstream transport details', async () => {
	fetchMock.mockRejectedValue(new Error('secret internal address'));
	await expect(actions.revoke(event({ id }))).rejects.toMatchObject({
		status: 503,
		body: { message: expect.not.stringContaining('secret') }
	});
});

test('a native form action can rerun loading without setting headers twice', async () => {
	const request = createEvent({ name: 'Key', channel: '123:456', expires_in_days: '90' });
	const headers = new Set<string>();
	request.setHeaders = vi.fn((values) => {
		for (const name of Object.keys(values)) {
			if (headers.has(name)) throw new Error('Header already set');
			headers.add(name);
		}
	});
	fetchMock.mockResolvedValueOnce(
		Response.json({ key: { id }, secret: 'new-secret' }, { status: 201 })
	);
	fetchMock.mockResolvedValueOnce(Response.json({ keys: [], channels: [] }));
	await actions.create(request);
	await load(request as Parameters<typeof load>[0]);
	expect(request.setHeaders).toHaveBeenCalledTimes(1);
});

test('rejects channel IDs larger than a Discord snowflake', async () => {
	expect(
		await actions.create(
			createEvent({ name: 'Key', channel: '123:18446744073709551616', expires_in_days: '90' })
		)
	).toMatchObject({ status: 400 });
	expect(fetchMock).not.toHaveBeenCalled();
});

test('rejects unknown creation fields', async () => {
	const request = createEvent({
		name: 'Key',
		channel: '123:456',
		expires_in_days: '90',
		user: 'attacker'
	});
	await expect(actions.create(request)).rejects.toMatchObject({ status: 400 });
	expect(fetchMock).not.toHaveBeenCalled();
});

test('only an explicit never-expires choice creates a null expiry', async () => {
	fetchMock.mockResolvedValue(
		Response.json({ key: { id, expires_at: null }, secret: 'one-time-secret' }, { status: 201 })
	);
	expect(
		await actions.create(
			createEvent({ name: 'Permanent', channel: '123:456', never_expires: 'true' })
		)
	).toEqual({ secret: 'one-time-secret' });
	expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
		name: 'Permanent',
		guild_id: '123',
		channel_id: '456',
		expires_in_days: null,
		creation_id: creationId
	});
});

test.each(['', 'false', 'on', 'TRUE', '1'])(
	'rejects invalid never-expires checkbox value %j',
	async (never_expires) => {
		expect(
			await actions.create(
				createEvent({ name: 'Key', channel: '123:456', never_expires, expires_in_days: '90' })
			)
		).toMatchObject({ status: 400 });
		expect(fetchMock).not.toHaveBeenCalled();
	}
);

test.each(['90', '91', '0', 'null', 'bad'])(
	'rejects contradictory never-expires and day values %j',
	async (expires_in_days) => {
		expect(
			await actions.create(
				createEvent({ name: 'Key', channel: '123:456', never_expires: 'true', expires_in_days })
			)
		).toMatchObject({ status: 400 });
		expect(fetchMock).not.toHaveBeenCalled();
	}
);

test('omitting the expiry without the explicit checkbox never creates a permanent key', async () => {
	expect(await actions.create(createEvent({ name: 'Key', channel: '123:456' }))).toMatchObject({
		status: 400
	});
	expect(fetchMock).not.toHaveBeenCalled();
});

test.each(['', 'not-a-uuid', '../other', 'ed00a680-4bb1-1c32-9705-63bb764b3792'])(
	'rejects invalid creation request ID %j',
	async (creation_id) => {
		expect(
			await actions.create(
				createEvent({ name: 'Key', channel: '123:456', expires_in_days: '90', creation_id })
			)
		).toMatchObject({ status: 400 });
		expect(fetchMock).not.toHaveBeenCalled();
	}
);

test('requires a creation request ID for native form submissions', async () => {
	expect(
		await actions.create(event({ name: 'Key', channel: '123:456', expires_in_days: '90' }))
	).toMatchObject({ status: 400 });
	expect(fetchMock).not.toHaveBeenCalled();
});

test('preserves the duplicate request explanation without recovering a secret', async () => {
	const message = 'This key request was already used. Reload to create another key.';
	fetchMock.mockResolvedValue(Response.json({ detail: message }, { status: 409 }));
	const result = await actions.create(
		createEvent({ name: 'Key', channel: '123:456', expires_in_days: '90' })
	);
	expect(result).toMatchObject({ status: 409, data: { message } });
	expect(result).not.toHaveProperty('secret');
});

test('management errors preserve the API detail message', async () => {
	fetchMock.mockResolvedValue(
		Response.json({ detail: 'At most five active API keys are allowed' }, { status: 409 })
	);
	const request = event();
	request.request = new Request(request.url);
	await expect(load(request as Parameters<typeof load>[0])).rejects.toMatchObject({
		status: 409,
		body: { message: 'At most five active API keys are allowed' }
	});
});

test('management requests allow the backend access checks fifteen seconds', async () => {
	const timeout = vi.spyOn(AbortSignal, 'timeout');
	fetchMock.mockResolvedValue(Response.json({ key: { id } }));
	try {
		await actions.revoke(event({ id }));
		expect(timeout).toHaveBeenCalledWith(15_000);
	} finally {
		timeout.mockRestore();
	}
});
