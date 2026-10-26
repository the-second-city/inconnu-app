import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getDocs } from '$lib/server/docs';

export const load: LayoutServerLoad = async () => {
	try {
		const { nav } = await getDocs();
		return { nav };
	} catch (err) {
		console.error('Docs: unable to load;', err);
		error(503, 'The docs are unavailable right now. Please try again shortly.');
	}
};
