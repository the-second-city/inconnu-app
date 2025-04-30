export type GameLine = 'cofd' | 'wod';
export type Splat = 'mortal' | 'vampire' | 'ghoul';

export type AdvantageType = 'merit' | 'flaw';

export type Advantage = {
	name: string;
	type: AdvantageType;
	rating: number;
};

export interface Guild {
	id: number;
	name: string;
	icon?: string;
}

export type Trait = {
	name: string;
	rating: number;
	category: string;
	subcategory: string;
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

export interface Character {
	_id: string;
	_class_id: string;
	name: string;
	profile: {
		description: string | null;
		history: string | null;
		images: string[];
	};
	line: GameLine;
	splat: Splat;
	experience?: {
		unspent: number;
		lifetime: number;
	};
	guild: number;
	user: number;
	health: string;
	willpower: string;
	grounding: Grounding;
	traits?: Trait[];
	macros?: Macro[];
	notes?: string[];
	virtues?: Trait[];
	advantages?: Advantage[];
	generation?: number;
	blood_potency?: number;
	max_vitae?: number;
	vitae?: number;
	max_bp?: number;
	blood_pool?: number;
}

export interface UserCharacters {
	guilds: Guild[];
	characters: Character[];
}
