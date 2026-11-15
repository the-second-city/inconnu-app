/**
 * A stand-in for `$app/state`'s `page` in component tests, since SvelteKit's router doesn't run
 * there. It's reactive, so components that read `page.url` update when a test navigates.
 *
 * Use it with `vi.mock('$app/state', () => import('$lib/testing/page.svelte'))`.
 */
import { SvelteURL } from 'svelte/reactivity';

export const page = $state<{ url: URL; data: Record<string, unknown> }>({
	url: new SvelteURL('http://localhost/'),
	data: { session: null }
});

/** Navigate to a URL, relative to the current one, as SvelteKit's router would. */
export const navigate = (url: string): void => {
	page.url = new SvelteURL(url, page.url);
};
