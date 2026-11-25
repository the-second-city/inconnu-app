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
	'photosynthesize'
];

/** A placeholder for a new macro's name, at random. */
export const randomPlaceholder = (): string =>
	NAME_PLACEHOLDERS[Math.floor(Math.random() * NAME_PLACEHOLDERS.length)];
