import type { ParamMatcher } from '@sveltejs/kit';

/**
 * A single file name: docs assets. No slashes, and no dot segments, which URL
 * encoding leaves alone.
 *
 * SvelteKit runs matchers before it decodes %2F and the like, so this decodes
 * the param first to see the name the route will get.
 */
export const match: ParamMatcher = (param) => {
	let name: string;
	try {
		name = decodeURIComponent(param);
	} catch {
		return false;
	}
	return name !== '.' && name !== '..' && /^[^/\\]{1,255}$/.test(name);
};
