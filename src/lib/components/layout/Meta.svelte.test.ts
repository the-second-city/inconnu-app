import { render } from '@testing-library/svelte';
import { afterEach, expect, test, vi } from 'vitest';

import { navigate } from '$lib/testing/page.svelte';
import Meta from './Meta.svelte';

vi.mock('$app/state', () => import('$lib/testing/page.svelte'));

afterEach(() => {
	document.head.innerHTML = '';
});

/** The page's og:image, as link previews read it. */
const ogImage = (): string | null | undefined =>
	document.head.querySelector('meta[property="og:image"]')?.getAttribute('content');

test('the default image is absolute, on this site', () => {
	navigate('https://inconnu.app/utils/beasty');
	render(Meta, { title: 'Beasty', description: 'Beast talk.' });

	expect(ogImage()).toBe('https://inconnu.app/favicon.png');
});

test('an image given as a path is made absolute', () => {
	navigate('https://inconnu.app/profile/abc');
	render(Meta, { title: 'Nadia', description: 'A vampire.', image: '/images/nadia.png' });

	expect(ogImage()).toBe('https://inconnu.app/images/nadia.png');
});

test('an absolute image is kept', () => {
	navigate('https://inconnu.app/profile/abc');
	render(Meta, {
		title: 'Nadia',
		description: 'A vampire.',
		image: 'https://pcs.inconnu.app/a.webp'
	});

	expect(ogImage()).toBe('https://pcs.inconnu.app/a.webp');
});
