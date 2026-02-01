/**
 * Canonical trait ordering for V5 character sheets.
 * Defines which traits belong in which category/subcategory and their display order.
 */

type TraitCategory = 'attribute' | 'skill';
type TraitSubcategory = 'physical' | 'social' | 'mental';

export const TRAIT_ORDER: Record<TraitCategory, Record<TraitSubcategory, string[]>> = {
	attribute: {
		physical: ['Strength', 'Dexterity', 'Stamina'],
		social: ['Charisma', 'Manipulation', 'Composure'],
		mental: ['Intelligence', 'Wits', 'Resolve']
	},
	skill: {
		physical: [
			'Athletics',
			'Brawl',
			'Craft',
			'Drive',
			'Firearms',
			'Larceny',
			'Melee',
			'Stealth',
			'Survival'
		],
		social: [
			'AnimalKen',
			'Etiquette',
			'Insight',
			'Intimidation',
			'Leadership',
			'Performance',
			'Persuasion',
			'Streetwise',
			'Subterfuge'
		],
		mental: [
			'Academics',
			'Awareness',
			'Finance',
			'Investigation',
			'Medicine',
			'Occult',
			'Politics',
			'Science',
			'Technology'
		]
	}
};

/**
 * Get the ordered list of trait names for a given category and subcategory
 */
export function getTraitOrder(cat: string, sub: string): string[] | null {
	if (cat === 'attribute' || cat === 'skill') {
		if (sub === 'physical' || sub === 'social' || sub === 'mental') {
			return TRAIT_ORDER[cat][sub];
		}
	}
	return null;
}
