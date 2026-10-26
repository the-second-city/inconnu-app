import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';

import Markdown from './Markdown.svelte';

test('renders formatting', () => {
	render(Markdown, { content: 'A **bold** and *quiet* night' });

	expect(screen.getByText('bold').tagName).toBe('STRONG');
	expect(screen.getByText('quiet').tagName).toBe('EM');
});

test('keeps single line breaks', () => {
	const { container } = render(Markdown, { content: 'First line\nSecond line' });

	expect(container.querySelector('br')).not.toBeNull();
});

test('strips images', () => {
	render(Markdown, { content: 'Look: ![portrait](https://example.com/portrait.png)' });

	expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

test('turns links into plain text', () => {
	render(Markdown, { content: 'Visit [the Elysium](https://example.com)' });

	expect(screen.queryByRole('link')).not.toBeInTheDocument();
	expect(screen.getByText(/the Elysium/)).toBeInTheDocument();
});

test('removes scripts and event handlers', () => {
	const { container } = render(Markdown, {
		content: '<script>alert(1)</script><p onclick="alert(2)">Hello</p>'
	});

	expect(container.querySelector('script')).toBeNull();
	expect(screen.getByText('Hello')).not.toHaveAttribute('onclick');
});
