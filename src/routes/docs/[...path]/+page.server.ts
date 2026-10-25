import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { docsHref, getDocs } from '$lib/server/docs';

export const load: PageServerLoad = async ({ params, parent }) => {
	await parent(); // The layout reports the docs being unavailable
	const docs = await getDocs();

	const page = docs.pages.get(params.path);
	if (page) {
		return { page };
	}

	// Old paths, including GitBook's, live on in Discord messages and bookmarks
	const target = docs.redirects[params.path];
	if (target !== undefined) {
		const [targetPath, anchor] = target.split('#');
		redirect(301, docsHref(targetPath, anchor));
	}

	error(404, 'Page not found');
};
