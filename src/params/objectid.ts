import type { ParamMatcher } from '@sveltejs/kit';

/** A MongoDB ObjectId: character and rolepost IDs. */
export const match: ParamMatcher = (param) => /^[0-9a-f]{24}$/i.test(param);
