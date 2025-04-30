import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import charData from '$lib/data/chardata.json';

export const GET: RequestHandler = async () => {
	return json(charData);
};
