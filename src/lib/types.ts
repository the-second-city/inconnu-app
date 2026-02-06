export type Splat = 'mortal' | 'vampire' | 'ghoul' | 'thin-blood';

export type AdvantageType = 'merit' | 'flaw';

export type Advantage = {
	name: string;
	type: AdvantageType;
	rating: number;
};

export interface Guild {
	id: number;
	name: string;
	icon: string | null;
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
	guild: number;
	user: number;
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

export interface UserCharacters {
	guilds: Guild[];
	characters: Character[];
}

export interface BaseProfile {
	id: string;
	guild: Guild;
	user: number;
	name: string;
	splat: Splat;
	profile: Profile;
	spc: boolean;
}
