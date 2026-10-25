import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { docsHref, getDocs, readingOrder } from '$lib/server/docs';

export const load: PageServerLoad = async ({ params, parent }) => {
	await parent(); // The layout reports the docs being unavailable
	const docs = await getDocs();

	const page = docs.pages.get(params.path);
	if (page) {
		// Previous and next pages follow the sidebar
		const order = readingOrder(docs.nav);
		const index = order.findIndex((link) => link.path === page.path);
		const previous = index > 0 ? order[index - 1] : null;
		const next = index >= 0 && index < order.length - 1 ? order[index + 1] : null;
		return { page, previous, next };
	}

	// Old paths, including GitBook's, live on in Discord messages and bookmarks
	const target = docs.redirects[params.path];
	if (target !== undefined) {
		const [targetPath, anchor] = target.split('#');
		redirect(301, docsHref(targetPath, anchor));
	}

	error(404, 'Page not found');
};
