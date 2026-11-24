import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';
import { fetchApi } from '$lib/server/api';

/** The image types served. Anything else (SVG, HTML) could run script from the app's origin. */
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif']);

/** Docs images, proxied from the Inconnu API, which requires the API key. */
export const GET: RequestHandler = async ({ params }) => {
	const response = await fetchApi(
		`${INCONNU_API_URL}/docs/assets/${encodeURIComponent(params.name)}`,
		{ headers: { Authorization: `Bearer ${API_KEY}` } },
		// Only the wait for the answer is timed: the image streams on to the browser, maybe a slow one
		{
			failure: { label: 'Docs', unavailable: 'Docs images are unavailable right now.' },
			timeout: 'response'
		}
	);
	if (!response.ok) {
		await response.body?.cancel();
		error(response.status === 404 ? 404 : 502, 'Image not found');
	}

	const type = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() ?? '';
	if (!IMAGE_TYPES.has(type)) {
		await response.body?.cancel();
		console.error(`Docs: refused asset ${params.name} of type ${type || 'unknown'}`);
		error(404, 'Image not found');
	}

	return new Response(response.body, {
		headers: {
			'Content-Type': type,
			'Cache-Control': response.headers.get('Cache-Control') ?? 'public, max-age=86400',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
