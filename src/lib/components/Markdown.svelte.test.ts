import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';

import Markdown, { PREVIEW_LENGTH } from './Markdown.svelte';

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

test('previews keep formatting', () => {
	render(Markdown, { content: 'A **bold** and *quiet* night', preview: true });

	expect(screen.getByText('bold').tagName).toBe('STRONG');
	expect(screen.getByText('quiet').tagName).toBe('EM');
});

test('previews keep single line breaks', () => {
	const { container } = render(Markdown, { content: 'First line\nSecond line', preview: true });

	expect(container.querySelector('br')).not.toBeNull();
});

test('previews are truncated', () => {
	const content = 'a'.repeat(PREVIEW_LENGTH) + 'TAIL';
	const { container } = render(Markdown, { content, preview: true });

	expect(container.textContent).not.toContain('TAIL');
	expect(container.textContent).toContain('a'.repeat(PREVIEW_LENGTH));
});

test.each([
	'<script>alert(1)</script>',
	'<p onclick="alert(2)">Hello</p>',
	'<img src="x" onerror="alert(3)">',
	'Inline <span onmouseover="alert(4)">span</span> here',
	'[<img src="x" onerror="alert(5)">](https://example.com)',
	'[click](javascript:alert(6))',
	'<javascript:alert(7)>',
	'![x" onerror="alert(8)](https://example.com/x.png)',
	'`<b onclick="alert(9)">code</b>`',
	'```"><img src=x onerror=alert(10)>\ncode\n```',
	'&lt;script&gt;alert(11)&lt;/script&gt;'
])('previews render no HTML from %s', (content: string) => {
	const { container } = render(Markdown, { content, preview: true });

	const allowed = new Set(['P', 'BR', 'STRONG', 'EM', 'CODE', 'PRE']);
	for (const el of container.querySelectorAll('*')) {
		expect(allowed).toContain(el.tagName);
		// Fenced code gets an escaped language class; nothing else has attributes
		const names = [...el.attributes].map((attr) => attr.name);
		expect(names).toEqual(el.tagName === 'CODE' && names.length ? ['class'] : []);
	}
	expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
