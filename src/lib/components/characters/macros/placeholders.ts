/** Placeholders for a new macro's name, picked at random: each a valid macro name. */
export const NAME_PLACEHOLDERS = [
	'hunt',
	'sneak',
	'sing',
	'dance',
	'lie',
	'jitterbug',
	'shoot',
	'punch',
	'reticulate_splines',
	'lurk',
	'spelunk',
	'frolic',
	'germinate',
	'drive',
	'hack',
	'sublimate',
	'brood',
	'skulk',
	'loom',
	'monologue',
	'scheme',
	'sulk',
	'haunt',
	'vogue',
	'pontificate',
	'brood_dramatically',
	'defenestrate',
	'waltz',
	'photosynthesize',
	'effervesce',
	'effluviate',
	'cogitate',
	'juxtapose',
	'menace',
	'juggle',
	'catapult'
];

/**
 * A placeholder for a new macro's name, at random, but not one the character has (`taken`, ignoring
 * case, as macro names are unique), which would suggest a name it can't use. If every one is taken,
 * any.
 */
export const randomPlaceholder = (taken: string[] = []): string => {
	const used = new Set(taken.map((name) => name.toLowerCase()));
	const free = NAME_PLACEHOLDERS.filter((name) => !used.has(name.toLowerCase()));
	const names = free.length > 0 ? free : NAME_PLACEHOLDERS;
	return names[Math.floor(Math.random() * names.length)];
};
