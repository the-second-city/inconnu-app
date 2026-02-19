import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';

export const GET: RequestHandler = async ({ params }) => {
	const { token } = params;

	return fetch(`${INCONNU_API_URL}/characters/wizard/${token}`, {
		headers: {
			Authorization: `Bearer ${API_KEY}`
		}
	});
};

export const POST: RequestHandler = async ({ params, request }) => {
	const payload = await request.json();

	return fetch(`${INCONNU_API_URL}/characters/wizard/${params.token}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${API_KEY}`
		},
		body: JSON.stringify(payload)
	});
};
