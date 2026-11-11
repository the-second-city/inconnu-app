import { beforeEach, expect, test, vi } from 'vitest';
import { GET } from './+server';

vi.mock('$env/static/private', () => ({
	API_KEY: 'website-only',
	INCONNU_API_URL: 'https://private.test'
}));
const fetchMock = vi.fn();
const token = `ink_${'a'.repeat(24)}_${'b'.repeat(43)}`;
const query = 'start=2026-11-11T00:00:00Z&end=2026-11-11T01:00:00Z';

function call(search = query, authorization = `Bearer ${token}`) {
	const url = new URL(`https://inconnu.test/api/v1/rolls?${search}`);
	return GET({
		url,
		request: new Request(url, {
			headers: {
				Authorization: authorization,
				'X-Discord-User-ID': 'attacker',
				'X-Integration-Key': 'attacker',
				Cookie: 'session=attacker'
			}
		})
	} as Parameters<typeof GET>[0]);
}

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock);
	fetchMock.mockReset();
});

test('forwards only scoped bearer and approved query through private service credentials', async () => {
	fetchMock.mockResolvedValue(
		Response.json(
			{ rolls: [], next_cursor: null },
			{ headers: { 'Set-Cookie': 'secret=bad', 'X-Internal': 'private' } }
		)
	);
	const result = await call();
	expect(result.status).toBe(200);
	expect(result.headers.get('cache-control')).toBe('no-store');
	expect(result.headers.get('set-cookie')).toBeNull();
	expect(result.headers.get('x-internal')).toBeNull();
	const [url, options] = fetchMock.mock.calls[0];
	expect(new URL(url).pathname).toBe('/integration-rolls');
	expect(options.headers.get('authorization')).toBe('Bearer website-only');
	expect(options.headers.get('X-Integration-Key')).toBe(token);
	expect(options.headers.has('X-Discord-User-ID')).toBe(false);
	expect(options.headers.has('cookie')).toBe(false);
	expect(options.redirect).toBe('error');
	expect(options.signal).toBeInstanceOf(AbortSignal);
});

test.each([
	'',
	'Bearer website-only',
	'Basic abc',
	`Bearer ${token} extra`,
	`Bearer ${token.toUpperCase()}`
])('rejects malformed external auth %s', async (authorization) => {
	expect((await call(query, authorization)).status).toBe(401);
	expect(fetchMock).not.toHaveBeenCalled();
});

test.each([
	`${query}&guild_id=123`,
	`${query}&limit=101`,
	`${query}&limit=0`,
	`${query}&limit=1&limit=2`,
	`${query}&cursor=`,
	'start=2026-11-11T00:00:00Z&end=2026-11-13T00:00:00Z',
	'start=2026-11-11T02:00:00Z&end=2026-11-11T01:00:00Z',
	'start=2026-11-11T00:00:00&end=2026-11-11T01:00:00Z',
	''
])('rejects invalid or expanded queries %s', async (search) => {
	expect((await call(search)).status).toBe(400);
	expect(fetchMock).not.toHaveBeenCalled();
});

test('preserves bounded retry-after but sanitizes upstream failures', async () => {
	fetchMock.mockResolvedValue(
		Response.json(
			{ detail: 'secret upstream trace' },
			{ status: 429, headers: { 'Retry-After': '60', 'X-Internal': 'private' } }
		)
	);
	const result = await call();
	expect(result.status).toBe(429);
	expect(result.headers.get('retry-after')).toBe('60');
	expect(await result.text()).not.toContain('secret');
});

test('transport failure returns generic no-store error', async () => {
	fetchMock.mockRejectedValue(new Error(`secret ${token}`));
	const result = await call();
	expect(result.status).toBe(503);
	expect(result.headers.get('cache-control')).toBe('no-store');
	expect(await result.text()).not.toContain(token);
});

test('rejects cursors beyond the backend bound', async () => {
	expect((await call(`${query}&cursor=${'a'.repeat(513)}`)).status).toBe(400);
	expect(fetchMock).not.toHaveBeenCalled();
});
