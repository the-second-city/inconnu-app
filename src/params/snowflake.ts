import type { ParamMatcher } from '@sveltejs/kit';

/** A Discord snowflake: guild IDs. */
export const match: ParamMatcher = (param) => /^\d{1,20}$/.test(param);
