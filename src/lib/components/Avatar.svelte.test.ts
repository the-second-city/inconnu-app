import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { expect, test } from 'vitest';

import Avatar, { initials } from './Avatar.svelte';

test.each([
	['Nadia', 'N'],
	['Camarilla of Chicago', 'CC'],
	['  lodin   the   elder ', 'LE'],
	['', '']
])('the initials of %j are %j', (name, expected) => {
	expect(initials(name)).toBe(expected);
});

test('shows the image, described by the name', () => {
	render(Avatar, { src: 'https://example.com/nadia.png', name: 'Nadia' });

	expect(screen.getByAltText('Nadia')).toHaveAttribute('src', 'https://example.com/nadia.png');
});

test.each([
	['missing', undefined],
	['null', null],
	['empty', '']
])('has no image when the source is %s', (_case, src) => {
	render(Avatar, { src, name: 'Nadia' });

	expect(screen.queryByAltText('Nadia')).not.toBeInTheDocument();
});

test('falls back to initials', () => {
	render(Avatar, { name: 'Camarilla of Chicago' });

	expect(screen.getByText('CC')).toBeInTheDocument();
});

test('a custom fallback replaces the initials', () => {
	const children = createRawSnippet(() => ({ render: () => '<span>?</span>' }));
	render(Avatar, { name: 'Nadia', children });

	expect(screen.getByText('?')).toBeInTheDocument();
	expect(screen.queryByText('N')).not.toBeInTheDocument();
});
