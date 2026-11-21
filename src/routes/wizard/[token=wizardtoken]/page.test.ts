import { expect, test, vi } from 'vitest';

import { TEST_CONSTRAINTS } from '$lib/testing/constraints';
import { load } from './+page';

/** The wizard data the API sends, with any fields replaced. */
const wizardData = (fields: Record<string, unknown> = {}): Record<string, unknown> => ({
	spc: false,
	guild: { id: '111', name: 'Camarilla of Chicago', icon: null, count: null },
	splats: ['vampire'],
	traits: [],
	constraints: TEST_CONSTRAINTS,
	expires_in: 1_800_000,
	...fields
});

/** Run the loader against a fetch that answers with the given wizard data. */
const runLoad = async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
	const fetch = vi.fn(async () => Response.json(data));
	const event = { params: { token: 'frivolous-giraffe-wench' }, fetch };
	return (await load(event as unknown as Parameters<typeof load>[0])) as Record<string, unknown>;
};

test("passes the bot's constraints to the page", async () => {
	expect((await runLoad(wizardData())).constraints).toEqual(TEST_CONSTRAINTS);
});

test('passes the time left before the link expires to the page', async () => {
	expect((await runLoad(wizardData())).expiresIn).toBe(1_800_000);
});

test('without an expiry from the API, the page gets null', async () => {
	expect((await runLoad(wizardData({ expires_in: undefined }))).expiresIn).toBeNull();
});
