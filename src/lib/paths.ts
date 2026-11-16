import { resolve } from '$app/paths';
import type { Pathname, RouteId } from '$app/types';

/**
 * `resolve()` for a path held in a variable typed as any of the app's paths (say, a link's
 * `href` prop). `resolve()`'s arguments are typed as one tuple per route, and once the app has
 * more than about 25 routes, TypeScript can't match an argument of the whole union against them.
 * This checks the argument as a `Pathname` (or route ID) instead, then calls `resolve()`.
 */
export const resolvePathname = (path: Pathname | RouteId): string =>
	(resolve as (path: string) => string)(path);
