import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import wizardData from '$lib/data/sample-wizard.json';

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
