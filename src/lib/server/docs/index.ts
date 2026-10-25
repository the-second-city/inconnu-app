import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { getErrorDetail } from '$lib';
import type { DocsBundle, DocsNavSection } from '$lib/types';
import { renderPage } from './render';

export { docsHref } from './render';

export interface RenderedDocsPage {
	path: string;
	title: string;
	description: string | null;
	html: string;
}

export interface Docs {
	version: string;
	nav: DocsNavSection[];
	pages: Map<string, RenderedDocsPage>;
	redirects: Record<string, string>;
}

// The bot serves the docs from memory, so a quick ETag check is cheap. We still
// check at most this often, and keep serving the last good copy if it's down.
const RECHECK_MS = 60_000;

let cached: Docs | null = null;
let checkedAt = 0;
let pending: Promise<Docs> | null = null;

/** Render every page in the bundle. */
const build = (bundle: DocsBundle): Docs => {
	const pathsByFile = new Map(bundle.pages.map((page) => [page.file, page.path]));
	const pages = new Map(
		bundle.pages.map((page) => [
			page.path,
			{
				path: page.path,
				title: page.title,
				description: page.description,
				html: renderPage(page, pathsByFile)
			}
		])
	);
	return { version: bundle.version, nav: bundle.nav, pages, redirects: bundle.redirects };
};

/** Fetch the docs if they've changed since we last rendered them. */
const refresh = async (): Promise<Docs> => {
	const headers: Record<string, string> = { Authorization: `Bearer ${API_KEY}` };
	if (cached) {
		headers['If-None-Match'] = `"${cached.version}"`;
	}

	try {
		const response = await fetch(`${INCONNU_API_URL}/docs`, { headers });
		if (response.status === 304 && cached) {
			return cached;
		}
		if (!response.ok) {
			throw new Error(await getErrorDetail(response, 'Failed to load the docs'));
		}
		cached = build(await response.json());
		return cached;
	} catch (err) {
		if (cached) {
			console.error('Docs: serving the last good copy;', err);
			return cached;
		}
		throw err;
	} finally {
		checkedAt = Date.now();
	}
};

/** The rendered docs. */
export const getDocs = async (): Promise<Docs> => {
	if (cached && Date.now() - checkedAt < RECHECK_MS) {
		return cached;
	}
	// Concurrent requests share one fetch
	pending ??= refresh().finally(() => (pending = null));
	return pending;
};
