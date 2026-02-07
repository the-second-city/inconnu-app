import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_KEY, INCONNU_API_URL } from '$env/static/private';

export const GET: RequestHandler = async ({ params }) => {
	const { token } = params;

	if (!token) {
		error(400, 'Token is required');
	}

	try {
		const response = await fetch(`${INCONNU_API_URL}/characters/wizard/${token}`, {
			headers: {
				Authorization: `Bearer ${API_KEY}`
			}
		});

		if (!response.ok) {
			error(response.status, 'Wizard session not found or expired');
		}

		const data = await response.json();
		return json(data);
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		error(500, 'Failed to load wizard data');
	}
};

export const POST: RequestHandler = async ({ params, request }) => {
	const { token } = params;

	if (!token) {
		error(400, 'Token is required');
	}

	try {
		const payload = await request.json();

		const response = await fetch(`${INCONNU_API_URL}/characters/wizard/${token}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${API_KEY}`
			},
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			error(response.status, errorData.message || 'Failed to create character.');
		}

		const data = await response.json();
		return json(data);
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		error(500, 'Failed to create character.');
	}
};
