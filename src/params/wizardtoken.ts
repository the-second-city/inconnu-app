import type { ParamMatcher } from '@sveltejs/kit';

/**
 * A character wizard token, like "frivolous-giraffe-wench". The bot owns the
 * format, so this only keeps out what could change the API path.
 */
export const match: ParamMatcher = (param) => /^[\w-]{1,100}$/.test(param);
