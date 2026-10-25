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
}

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
