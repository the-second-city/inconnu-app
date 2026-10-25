import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';

/** Docs images, proxied from the Inconnu API, which requires the API key. */
export const GET: RequestHandler = async ({ params }) => {
	const response = await fetch(
		`${INCONNU_API_URL}/docs/assets/${encodeURIComponent(params.name)}`,
		{ headers: { Authorization: `Bearer ${API_KEY}` } }
	);
	if (!response.ok) {
		error(response.status === 404 ? 404 : 502, 'Image not found');
	}

	return new Response(response.body, {
		headers: {
			'Content-Type': response.headers.get('Content-Type') ?? 'application/octet-stream',
			'Cache-Control': response.headers.get('Cache-Control') ?? 'public, max-age=86400'
		}
	});
};
