export type Splat = 'mortal' | 'vampire' | 'ghoul' | 'thin-blood';

export type AdvantageType = 'merit' | 'flaw';

export type Advantage = {
	name: string;
	type: AdvantageType;
	rating: number;
};

export interface Guild {
	id: string;
	name: string;
	icon: string | null;
	count: number | null;
}

export type Trait = {
	name: string;
	rating: number;
	type: string;
	subtraits: string[];
};

export type Grounding = {
	path: string;
	rating: number;
};

type PoolElem = number | string;
export type TrackType = 'willpower' | 'health';

type Macro = {
	name: string;
	pool: PoolElem[];
	keys: PoolElem[];
	target: number;
	rote: boolean;
	hunt: boolean;
	comment: string | null;
};

export interface Profile {
	description: string | null;
	biography: string | null;
	images: string[];
}

export interface Character {
	_id: string;
	name: string;
	guild: string;
	user: string;
	splat: Splat;
	profile: Profile;
	experience?: {
		current: number;
		total: number;
	};
	health: string;
	willpower: string;
	humanity: number;
	stains: number;
	traits: Trait[];
	potency?: number;
	hunger?: number;
	generation?: number;
	blood_potency?: number;
	max_vitae?: number;
	vitae?: number;
	max_bp?: number;
	blood_pool?: number;
	log?: CharacterLog;
}

/**
 * When the character was created and its owner left, and running counts of gameplay events.
 * Mirrors the bot's `VCharLog`. Dates are ISO strings; ones read from the database have no
 * offset but are UTC.
 */
export interface CharacterLog {
	created: string;
	left: string | null; // The owner left the server
	deepest_degeneration: number; // Most Stains ever beyond Humanity's empty boxes
	degenerations: number;
	frenzy_resisted: number;
	health_aggravated: number;
	health_superficial: number;
	hunger_gained: number;
	hunger_slaked: number;
	hunts: number;
	remorse_checks: number;
	remorse_failures: number;
	remorse_successes: number;
	rouse_checks: number;
	rouse_failures: number;
	rouse_successes: number;
	stains_gained: number;
	surges: number;
	times_awakened: number;
	times_blushed: number;
	times_frenzied: number;
	times_impaired: number; // Times going from unimpaired to impaired
	times_mended: number; // Superficial and Aggravated healing
	times_slaked: number;
	willpower_aggravated: number;
	willpower_superficial: number;
	worst_health: string; // The Health track at its worst; empty if never damaged
	worst_willpower: string; // Likewise for Willpower
	incomplete_since: Partial<Record<CharacterLogStat, string>>; // Stats added after creation
}

/** The log's running counts. (`incomplete_since` is skipped, as its type refers to this one.) */
type LogKey = Exclude<keyof CharacterLog, 'incomplete_since'>;
export type CharacterLogCounter = {
	[K in LogKey]: CharacterLog[K] extends number ? K : never;
}[LogKey];

/** The log's damage tracks at their worst. */
export type CharacterLogTrack = 'worst_health' | 'worst_willpower';

/** Every stat in the log: its counts and its worst tracks. */
export type CharacterLogStat = CharacterLogCounter | CharacterLogTrack;

export interface PublicCharacter {
	id: string;
	user: string;
	name: string;
	splat: Splat;
	profile: Profile;
}

export interface OwnerData {
	id: string;
	name: string;
	icon: string | null;
}

export interface CharacterData {
	guild: Guild;
	owner: OwnerData | null;
	character: Character | PublicCharacter;
	spc: boolean;
	type: 'full' | 'public';
}

export interface AuthorizedUserChars {
	guilds: Guild[];
	characters: CharacterData[];
}

export interface GuildChars {
	guild: Guild;
	characters: CharacterData[];
}

export interface CharData {
	id: string;
	name: string;
}

export interface PostHistoryEntry {
	date: string;
	content: string;
}

export interface Changelog {
	guild: Guild;
	poster: OwnerData | null;
	channel: string;
	character: CharData;
	url: string | null;
	history: PostHistoryEntry[];
	deletion_date: string | null;
}

// Docs, served by the Inconnu API from the bot repo's docs/ directory

export interface DocsNavItem {
	title: string;
	path: string | null; // A docs page path, such as 'guides/quickstart'
	url: string | null; // An external link
	children: DocsNavItem[];
}

export interface DocsNavSection {
	title: string | null; // Untitled sections are separated by a divider
	items: DocsNavItem[];
}

export interface DocsPage {
	path: string; // URL path; '' is the docs home page
	file: string; // Source file, such as 'guides/quickstart/README.md'
	title: string;
	description: string | null;
	markdown: string;
}

export interface DocsBundle {
	version: string;
	nav: DocsNavSection[];
	pages: DocsPage[];
	redirects: Record<string, string>; // Old path -> new path, with optional #anchor
}
