import { expect, test } from 'vitest';

import { SheetHighlight } from './sheetHighlight.svelte';
import type { Character, Trait } from '$lib/types';

/** A trait of the type, rated 2. */
const trait = (name: string, type: string): Trait => ({ name, rating: 2, type, subtraits: [] });

/** A vampire with these traits. */
const character = (traits: Trait[]): Character => ({
	_id: 'abc',
	name: 'Nadia',
	guild: '111',
	user: '222',
	splat: 'vampire',
	profile: { description: null, biography: null, images: [] },
	health: '......',
	willpower: '.....',
	humanity: 7,
	stains: 0,
	potency: 3,
	hunger: 2,
	traits
});

test("showing a macro highlights its traits by the sheet's names, with their signs", () => {
	const highlight = new SheetHighlight();
	const traits = [trait('Strength', 'attribute'), trait('Brawl', 'skill')];

	highlight.show(['strength', '-', 'brawl'], character(traits));

	expect(highlight.of('Strength')).toEqual({
		kind: 'trait',
		trait: 'Strength',
		specialty: null,
		negative: false
	});
	expect(highlight.of('Brawl')?.negative).toBe(true);
	expect(highlight.of('Potence')).toBeUndefined();

	highlight.hide();
	expect(highlight.of('Strength')).toBeUndefined();
});
