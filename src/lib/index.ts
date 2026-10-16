// place files you want to import through the `$lib` alias in this folder.

import type { Profile } from './types';

export const isValidTraitName = (name: string): boolean => {
	if (name.length === 0) return false;

	const validPattern = /^[A-Za-z_]+$/;
	return validPattern.test(name);
};

// Mirrors RESERVED_TRAITS and the power bonus check in the bot's validate_trait_names()
const RESERVED_TRAITS = [
	'willpower',
	'hunger',
	'humanity',
	'surge',
	'potency',
	'bane',
	'current_hunger',
	'powerbonus',
	'power_bonus'
];

/**
 * Checks whether a trait name is reserved by the bot and can't be used as a trait.
 * @param name - The trait name to check
 * @returns True if the name is reserved
 */
export const isReservedTraitName = (name: string): boolean => {
	return RESERVED_TRAITS.includes(name.toLowerCase());
};

export const normalize = (text: string): string => {
	return text.split(/\s+/).filter(Boolean).join(' ');
};

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

export const DISCORD_URL = 'https://discord.gg/QHnCdSPeEE';

export const hasProfileContent = (profile: Profile): boolean => {
	return !!(
		(profile.description && profile.description.trim()) ||
		(profile.biography && profile.biography.trim()) ||
		(profile.images && profile.images.length > 0)
	);
};
