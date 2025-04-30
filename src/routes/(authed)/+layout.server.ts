import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const data = await event.parent();
	if (data.session === null) {
		const returnUrl = event.url.pathname;
		redirect(303, `/signin?callbackUrl=${encodeURIComponent(returnUrl)}`);
	}
	return data;
};
