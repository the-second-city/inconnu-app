import { expect, test, vi } from 'vitest';

import { load } from './+page';

/** The wizard data the API sends, with any fields replaced. */
const wizardData = (fields: Record<string, unknown> = {}): Record<string, unknown> => ({
	spc: false,
	guild: { id: '111', name: 'Camarilla of Chicago', icon: null, count: null },
	splats: ['vampire'],
	traits: [],
	...fields
});

/** Run the loader against a fetch that answers with the given wizard data. */
const runLoad = async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
	const fetch = vi.fn(async () => Response.json(data));
	const event = { params: { token: 'frivolous-giraffe-wench' }, fetch };
	return (await load(event as unknown as Parameters<typeof load>[0])) as Record<string, unknown>;
};

test("passes the bot's Health and Willpower limits to the page", async () => {
	const limits = { health: { min: 5, max: 15 }, willpower: { min: 2, max: 12 } };

	expect((await runLoad(wizardData({ limits }))).limits).toEqual(limits);
});

test("falls back to the bot's known limits when it doesn't send them", async () => {
	expect((await runLoad(wizardData())).limits).toEqual({
		health: { min: 3, max: 25 },
		willpower: { min: 2, max: 25 }
	});
});
