// place files you want to import through the `$lib` alias in this folder.

import type { Profile } from './types';

export const normalize = (text: string): string => {
	return text.split(/\s+/).filter(Boolean).join(' ');
};

/** Replace curly apostrophes (which phones type) with straight ones, as the bot's
 * `straighten_apostrophes` does for trait names. */
export const straightenApostrophes = (text: string): string => text.replace(/[\u2018\u2019]/g, "'");

/**
 * A name as the bot checks and stores it (its `clean_name`): curly apostrophes, which phones type,
 * straightened, then whitespace collapsed. Use it for character names, which the bot cleans before
 * validating, so "O’Brien" is accepted as "O'Brien".
 */
export const cleanName = (name: string): string => normalize(straightenApostrophes(name));

/**
 * A string's length in code points, as Python's `len()` counts it. JS's `length` counts UTF-16
 * code units, so a code point outside the Basic Multilingual Plane (🩸, 𝓢𝓬𝓻𝓲𝓹𝓽) counts twice
 * there. Not graphemes (as `Intl.Segmenter` counts them): an emoji built of several code points
 * (👨‍👩‍👧, skin tones, flags) counts each, as Python does. Check text against the bot's limits with
 * this, not `length`.
 * @param text - The text to measure
 * @returns The number of code points
 */
export const codePointLength = (text: string): number => [...text].length;

export const insensitiveSort = (items: string[]) => {
	items.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
};

/**
 * Removes leading articles (The, A, An) from a string for sorting purposes.
 * @param text - The text to process
 * @returns The text with leading articles removed
 */
export const stripLeadingArticles = (text: string): string => {
	return text.replace(/^(The|A|An)\s+/i, '');
};

/**
 * Extracts the error detail from a FastAPI error response. Handles both
 * HTTPException (string detail) and request validation errors (a list of
 * error objects, each with a `msg` field).
 * @param response - The fetch Response object
 * @param fallback - Default message if detail can't be extracted
 * @returns The error detail string
 */
export const getErrorDetail = async (
	response: Response,
	fallback = 'An unexpected error occurred.'
): Promise<string> => {
	const data = await response.json().catch(() => null);
	const detail = data?.detail;

	if (Array.isArray(detail)) {
		const messages = detail
			.map((err) => err?.msg)
			.filter((msg): msg is string => typeof msg === 'string')
			.map((msg) => msg.replace(/^Value error, /, ''));
		return messages.length > 0 ? messages.join('\n') : fallback;
	}
	if (typeof detail === 'string') return detail;
	if (typeof data?.message === 'string') return data.message;
	return fallback;
};

/** The bot's OAuth link, which adds Inconnu to a server. */
export const INSTALL_URL =
	'https://discord.com/oauth2/authorize?client_id=882409882119196704&permissions=536872960&scope=applications.commands+bot';
export const DISCORD_URL = 'https://discord.gg/QHnCdSPeEE';
export const PATREON_URL = 'https://patreon.com/tiltowait';

/** Whether a URL from the API is safe to link to: https only, so no javascript: or data: URLs. */
export const isHttpsUrl = (url: string): boolean => {
	try {
		return new URL(url).protocol === 'https:';
	} catch {
		return false;
	}
};

export const hasProfileContent = (profile: Profile): boolean => {
	return !!(
		(profile.description && profile.description.trim()) ||
		(profile.biography && profile.biography.trim()) ||
		(profile.images && profile.images.length > 0)
	);
};

/** Parse a date from the API. The database stores naive UTC, so a date-time without an offset
 * is UTC. */
export const parseApiDate = (date: string): Date =>
	new Date(/T[^Z+-]*$/.test(date) ? `${date}Z` : date);

/** A count with its noun, singular or plural: "1 die", "2 dice". */
export const plural = (n: number, one: string, many: string): string =>
	`${n} ${n === 1 ? one : many}`;

/**
 * Join items into a phrase of alternatives: "A", "A or B", "A, B, or C" (with the serial
 * comma). Empty for no items.
 */
export const orList = (items: string[]): string => {
	if (items.length <= 2) return items.join(' or ');
	return `${items.slice(0, -1).join(', ')}, or ${items.at(-1)}`;
};

/** Uppercase the first letter of some text, leaving the rest as it is. */
export const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
