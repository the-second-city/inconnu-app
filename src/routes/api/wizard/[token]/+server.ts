import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import wizardData from '$lib/data/sample-wizard.json';

const INCONNU_API_URL = 'https://inconnu.app';

export const GET: RequestHandler = async ({ params }) => {
	const { token } = params;

	// TODO: Validate token and fetch from Inconnu bot
	// const response = await fetch(`${INCONNU_API_URL}/wizard/${token}`);
	// if (!response.ok) {
	//   error(response.status, 'Wizard session not found or expired');
	// }
	// const data = await response.json();

	// For now, just return sample data
	// In production, this will validate the token with the bot
	// and return 404 if expired/invalid
	if (!token) {
		error(400, 'Token is required');
	}

	return json(wizardData);
};

export const POST: RequestHandler = async ({ params, request }) => {
	const { token } = params;

	if (!token) {
		error(400, 'Token is required');
	}

	try {
		const payload = await request.json();

		const response = await fetch(`${INCONNU_API_URL}/character/create/${token}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			error(response.status, errorData.message || 'Failed to create character');
		}

		const data = await response.json();
		return json(data);
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		error(500, 'Failed to create character');
	}
};
