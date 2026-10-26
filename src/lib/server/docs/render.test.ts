import { expect, test } from 'vitest';

import type { DocsPage } from '$lib/types';
import { docsHref, renderPage, type LinkedPage } from './render';

// The pages a rendered page can link to, keyed by source file
const PAGES = new Map<string, LinkedPage>([
	['README.md', { path: '', title: 'Inconnu' }],
	['guides/quickstart/README.md', { path: 'guides/quickstart', title: 'Quickstart' }],
	[
		'guides/quickstart/specialties.md',
		{ path: 'guides/quickstart/specialties', title: 'Specialties' }
	],
	['command-reference/rolls/README.md', { path: 'command-reference/rolls', title: 'Rolls' }],
	['command-reference/macros.md', { path: 'command-reference/macros', title: 'Macros' }]
]);

/** Render Markdown as if it were the page at `file`. */
const render = (markdown: string, file = 'guides/quickstart/specialties.md'): string => {
	const page: DocsPage = { path: '', file, title: 'Test', description: null, markdown };
	return renderPage(page, PAGES);
};

test.each([
	['', undefined, '/docs'],
	['guides/quickstart', undefined, '/docs/guides/quickstart'],
	['command-reference/macros', 'macro-create', '/docs/command-reference/macros#macro-create']
])('docsHref(%j, %j) is %j', (path: string, anchor: string | undefined, expected: string) => {
	expect(docsHref(path, anchor)).toBe(expected);
});

test('relative links to pages become docs routes', () => {
	const html = render(
		'See [macros](../../command-reference/macros.md) and [home](../../README.md).'
	);
	expect(html).toContain('href="/docs/command-reference/macros"');
	expect(html).toContain('href="/docs"');
});

test('links to a README go to its directory, keeping anchors', () => {
	const html = render('Try [/vr](../../command-reference/rolls/README.md#vr) now.');
	expect(html).toContain('href="/docs/command-reference/rolls#vr"');
});

test('links to unknown files are left alone', () => {
	expect(render('A [mystery](missing.md) link.')).toContain('href="missing.md"');
});

test('external links open in a new tab', () => {
	const html = render('Join [Discord](https://discord.gg/example).');
	expect(html).toContain('href="https://discord.gg/example"');
	expect(html).toContain('target="_blank"');
	expect(html).toContain('rel="noopener noreferrer"');
});

test('anchor-only links stay on the page', () => {
	const html = render('Jump to [setup](#server-setup).');
	expect(html).toContain('href="#server-setup"');
	expect(html).not.toContain('target=');
});

test('headings get GitHub-style anchors, numbering repeats', () => {
	const html = render(
		"## /macro create\n\n### You aren't able to upload images\n\n## Notes\n\n## Notes\n\n# 🥇 Specialties"
	);
	expect(html).toContain('<h2 id="macro-create">');
	expect(html).toContain('<h3 id="you-arent-able-to-upload-images">');
	expect(html).toContain('<h2 id="notes">');
	expect(html).toContain('<h2 id="notes-1">');
	expect(html).toContain('<h1 id="-specialties">');
});

test('code in a heading counts toward its anchor', () => {
	expect(render('### `experience_permissions`')).toContain('<h3 id="experience_permissions">');
});

test.each([
	['NOTE', 'Note', 'border-surface-400'],
	['TIP', 'Tip', 'border-success-500'],
	['IMPORTANT', 'Important', 'border-secondary-500'],
	['WARNING', 'Warning', 'border-warning-500'],
	['CAUTION', 'Caution', 'border-error-500']
])('[!%s] becomes a callout', (kind: string, label: string, border: string) => {
	const html = render(`> [!${kind}]\n> Some **bold** advice.`);
	expect(html).toContain('class="docs-alert');
	expect(html).toContain(border);
	expect(html).toContain(`role="note" aria-label="${label}"`);
	expect(html).toContain('<strong>bold</strong> advice.');
	expect(html).not.toContain('[!');
});

test('callouts keep code blocks and lists', () => {
	const html = render('> [!TIP]\n> Example:\n>\n> ```\n> /vr syntax:7 3 2\n> ```\n>\n> * One');
	expect(html).toContain('<pre><code>/vr syntax:7 3 2');
	expect(html).toContain('<li>One</li>');
});

test('ordinary and unknown blockquotes stay blockquotes', () => {
	expect(render('> Just a quote.')).toContain('<blockquote>');
	expect(render('> [!SHRUG]\n> Not a callout.')).toContain('<blockquote>');
});

test('an image alone in a paragraph becomes a figure with its title as the caption', () => {
	const html = render('![A roll](../../assets/roll.png "Example roll")');
	expect(html).toContain('<figure><img src="/docs/assets/roll.png" alt="A roll" loading="lazy">');
	expect(html).toContain('<figcaption>Example roll</figcaption>');
	expect(html).not.toContain('<p><figure>');
});

test('images in running text stay inline', () => {
	const html = render('Look: ![icon](../../assets/icon.png) here.');
	expect(html).toContain('<p>Look: <img src="/docs/assets/icon.png"');
	expect(html).not.toContain('<figure>');
});

test("a link alone in a paragraph becomes a card labeled with the page's title", () => {
	const html = render(
		'[`/vr`: the faster roll command](../../command-reference/rolls/README.md#vr)'
	);
	expect(html).toContain('href="/docs/command-reference/rolls#vr"');
	expect(html).toContain('not-prose');
	expect(html).toMatch(/<span class="[^"]*font-sans[^"]*">Rolls<\/span>/);
	expect(html).toContain('<code>/vr</code>: the faster roll command');
});

test("a link card isn't labeled when its text is the page's title", () => {
	const html = render('[Quickstart](../quickstart/README.md)');
	expect(html).toContain('not-prose');
	expect(html).not.toMatch(/font-sans/);
});

test('external links alone in a paragraph stay ordinary links', () => {
	const html = render('[Patreon](https://www.patreon.com/tiltowait)');
	expect(html).not.toContain('not-prose');
	expect(html).toContain('<p><a href="https://www.patreon.com/tiltowait"');
});

test('raw HTML is sanitized', () => {
	const html = render('Hi <script>alert(1)</script><img src="x.png" onerror="alert(1)">');
	expect(html).not.toContain('<script');
	expect(html).not.toContain('onerror');
});

test('details blocks survive sanitizing', () => {
	const html = render('<details>\n\n<summary>More</summary>\n\nHidden text\n\n</details>');
	expect(html).toContain('<details>');
	expect(html).toContain('<summary>More</summary>');
});
