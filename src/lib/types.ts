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

export type TrackType = 'willpower' | 'health';

/** An inclusive range of allowed values. */
export interface Range {
	min: number;
	max: number;
}

/**
 * What the bot accepts for character names, traits, and sheet values (the Inconnu API's
 * `GET /constraints`, and the wizard's `constraints`). Served by the bot so the app checks input
 * as the bot does, without copies of its limits to drift. See `$lib/constraints`.
 */
export interface Constraints {
	name_pattern: string; // A JS pattern for the normalized name; use it with the u flag
	name_max_length: number;
	trait_pattern: string; // Shared by traits, specialties, and powers
	trait_max_length: number;
	trait_rating: Range;
	reserved_traits: string[]; // Name keys (see nameKey()) no trait may have
	// No word after a trait's first may be a prefix of hunger_word or one of hunger_aliases
	// (case-insensitive), since rolls read it as Hunger
	hunger_word: string;
	hunger_aliases: string[];
	conviction_count: number;
	conviction_max_length: number;
	profile_max_length: number; // Description and history, each
	trackers: Record<TrackType, Range>; // Health and Willpower box counts
	humanity: Range;
	stains: Range;
	hunger: Record<Splat, Range | null>; // null: the splat doesn't have it
	potency: Record<Splat, Range | null>;
	macro_name_pattern: string; // A JS pattern: letters and underscores, with at least one letter
	macro_name_max_length: number;
	macro_comment_max_length: number;
	macro_difficulty: Range;
	macro_rouses: Range;
	macro_staining: string[]; // A macro's `staining` values
}

/**
 * A roll macro. Mirrors the bot's `VCharMacro`.
 *
 * `pool` is the bot's expanded pool: trait keys (a trait's name, then any specialties or powers,
 * joined by `.`: "Brawl.Kindred"), operators (`+`, `-`), and numbers, each a token. It never
 * holds Hunger, which `hunger` adds instead.
 */
export interface Macro {
	name: string; // Letters and underscores
	pool: string[]; // Empty when the macro only makes Rouse Checks
	hunger: boolean; // Rolls the character's current Hunger dice
	difficulty: number; // The default; 0 for none
	rouses: number; // Rouse Checks made when it's rolled
	reroll_rouses: boolean;
	staining: string; // "apply": the Rouse Checks can Stain (Oblivion); "show" (or "no") otherwise
	hunt: boolean; // Offers to slake Hunger on a win
	comment: string | null;
}

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
	experience?: Experience;
	health: string;
	willpower: string;
	humanity: number;
	stains: number;
	convictions?: string[]; // Up to 3; may contain blanks
	traits: Trait[];
	potency?: number;
	hunger?: number;
	blood_potency?: number;
	log?: CharacterLog;
	macros?: Macro[]; // Sorted by name, ignoring case
}

/** A Rouse request. Mirrors the bot's `RouseBody`. */
export interface RouseRequest {
	count: number; // 1-3
	reroll: boolean; // Re-roll failures, as high Blood Potency allows
	oblivion_stains: boolean; // Apply the guild's Oblivion Stains, as for an Oblivion power
}

/**
 * The outcome of Rouse checks. Mirrors the bot's `RouseResult`. Ghouls take one Aggravated Health
 * damage instead (`aggravated`), with no successes or failures.
 */
export interface RouseResult {
	successes: number;
	failures: number;
	hunger: number; // After the checks
	frenzy: boolean; // Rousing at Hunger 5, pass or fail, calls for a frenzy test
	aggravated: number;
	stains: number; // Oblivion Stains applied
	degeneration: number;
	dice: number[][]; // Each check's faces: the first, then any re-roll (none for ghouls)
	oblivion_faces: number[]; // The server's Oblivion Stain faces, applied or not
}

/**
 * A request to heal damage. Mirrors the bot's `MendBody`. Health heals as `/mend` and `/aggheal`
 * do (vampires Rouse); Willpower recovers what `/awaken` would (Superficial) or one Aggravated,
 * without Rouses.
 */
export interface MendRequest {
	type: 'superficial' | 'aggravated';
	track: TrackType;
}

/** The outcome of healing damage. Mirrors the bot's `MendResult`. */
export interface MendResult {
	track: string; // The healed track
	dice: number[]; // Rouse dice: one to mend, three for Aggravated; none for non-vampires or Willpower
	hunger: number; // After the Rouse Checks
	frenzy: boolean; // A failed mending Rouse at Hunger 5 calls for a frenzy check
	torpor: boolean; // Healing Aggravated damage pushed Hunger past 5
}

/**
 * Damage to deal. Mirrors the bot's `DamageBody`: Superficial applies first (wrapping into
 * Aggravated past the track's end), then Aggravated.
 */
export interface DamageRequest {
	track: TrackType;
	superficial: number;
	aggravated: number;
}

/** An amount of Hunger to slake or Stains to add, 1-10. Mirrors the bot's `AmountBody`. */
export interface AmountRequest {
	amount: number;
}

/** The outcome of slaking Hunger. Mirrors the bot's `SlakeResult`. */
export interface SlakeResult {
	frenzy: boolean; // Slaking from Hunger 4 or more calls for a frenzy test (Difficulty 3)
}

/** A Remorse test's options, as `/remorse`'s. Mirrors the bot's `RemorseBody`. */
export interface RemorseRequest {
	min_override: number; // The fewest dice to roll, 1-5; normally 1
	lasombra_alt: boolean; // The Lasombra alternative Bane: Bane Severity fewer dice (at least 1)
}

/** The outcome of a Remorse test. Mirrors the bot's `RemorseResult`. Either way, Stains clear. */
export interface RemorseResult {
	remorseful: boolean; // Passed, keeping Humanity
	dice: number[];
	humanity: number; // After the test
}

/** A frenzy test's dice penalty: Brujah Fury (Bane Severity) or Malkavian Terror (2). */
export type FrenzyPenalty = 'brujah' | 'malkavian';

/** An advantage that aids in resisting frenzy. Mirrors the bot's `FrenzyAdvantage`. */
export type FrenzyAdvantage =
	| 'cold_dead_hunger'
	| 'gentle_mind'
	| 'jewel_in_the_garden'
	| 'the_dream'
	| 'the_heart_of_darkness';

/** A frenzy test's options. Mirrors the bot's `FrenzyBody`: bonus dice and advantages may combine. */
export interface FrenzyRequest {
	difficulty: number; // 1-10
	penalty: FrenzyPenalty | null;
	bonus: number; // Flat bonus dice, 0-7
	advantages: FrenzyAdvantage[]; // Advantages' bonus dice, or The Dream's re-roll
}

/** The outcome of a frenzy test. Mirrors the bot's `FrenzyResult`. */
export interface FrenzyResult {
	passed: boolean; // Resisted frenzy
	critical: boolean; // Resisted without losing a turn
	pool: number; // After the penalty and bonuses
	dice: number[]; // The final faces
	original: number[] | null; // The faces before The Dream's re-roll, if used
}

/** A character's experience and its log. Mirrors the bot's `VCharExperience`. */
export interface Experience {
	current: number; // Unspent
	total: number; // Lifetime
	log: ExperienceEntry[]; // Oldest first
}

/** How an experience entry changed the character's XP. Lifetime awards also add unspent XP. */
export type ExperienceEvent =
	'award_unspent' | 'award_lifetime' | 'deduct_unspent' | 'deduct_lifetime';

/**
 * An award or deduction of experience. Mirrors the bot's `VCharExperienceEntry`, minus `admin`,
 * the recording user's Discord ID: the app can't show their name, and as a JSON number the ID
 * loses precision anyway.
 */
export interface ExperienceEntry {
	event: ExperienceEvent;
	amount: number; // Negative for deductions
	reason: string;
	date: string; // ISO; naive UTC, like the character log's dates
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
	num_victims_drained: number; // Drains chosen in a hunt's Slake menu
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
