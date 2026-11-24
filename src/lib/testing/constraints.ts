import type * as ConstraintsModule from '$lib/constraints';
import type { Constraints } from '$lib/types';

/** The bot's constraints, as its `GET /constraints` serves them, for tests. */
export const TEST_CONSTRAINTS: Constraints = {
	name_pattern: "^[\\p{L}\\p{N}_ '-]+$",
	name_max_length: 30,
	trait_pattern: "^'*[A-Za-z_][A-Za-z_']*(?: '*[A-Za-z_][A-Za-z_']*)*$",
	trait_max_length: 40,
	trait_rating: { min: 0, max: 5 },
	reserved_traits: [
		'bane',
		'current_hunger',
		'humanity',
		'hunger',
		'potency',
		'power_bonus',
		'powerbonus',
		'surge',
		'willpower'
	],
	hunger_word: 'hunger',
	hunger_aliases: ['current_hunger'],
	conviction_count: 3,
	conviction_max_length: 200,
	profile_max_length: 1024,
	trackers: {
		health: { min: 3, max: 25 },
		willpower: { min: 2, max: 25 }
	},
	humanity: { min: 0, max: 10 },
	stains: { min: 0, max: 10 },
	hunger: {
		vampire: { min: 0, max: 5 },
		ghoul: null,
		mortal: null,
		'thin-blood': { min: 0, max: 5 }
	},
	potency: {
		vampire: { min: 0, max: 10 },
		ghoul: null,
		mortal: null,
		'thin-blood': { min: 0, max: 2 }
	},
	macro_name_pattern: '^_*[A-Za-z][A-Za-z_]*$',
	macro_name_max_length: 50,
	macro_comment_max_length: 300,
	macro_difficulty: { min: 0, max: 100 },
	macro_rouses: { min: 0, max: 5 },
	macro_staining: ['apply', 'show', 'no']
};

/**
 * A `vi.mock('$lib/constraints', ...)` factory: the real module, but `getConstraints()` gives
 * `TEST_CONSTRAINTS`, as if the character page or wizard had provided them. Import it inside the
 * factory, since `vi.mock` is hoisted above imports:
 * `vi.mock('$lib/constraints', async (original) => (await import('$lib/testing/constraints')).mockConstraints(original))`
 */
export const mockConstraints = async (
	importOriginal: () => Promise<typeof ConstraintsModule>
): Promise<typeof ConstraintsModule> => ({
	...(await importOriginal()),
	getConstraints: () => () => TEST_CONSTRAINTS
});
