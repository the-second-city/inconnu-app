import type { ParamMatcher } from '@sveltejs/kit';

/**
 * A macro's name, as the bot allows them (its `macro_name_pattern`): letters and underscores, with
 * at least one letter. Its length is the API's to check.
 */
export const match: ParamMatcher = (param) => /^_*[A-Za-z][A-Za-z_]*$/.test(param);
