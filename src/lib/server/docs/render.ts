import { Marked, type Token, type Tokens } from 'marked';
import GithubSlugger from 'github-slugger';
import DOMPurify from 'isomorphic-dompurify';

import { DOCS_CARD_CLASSES } from '$lib/constants/docsStyles';
import type { DocsPage } from '$lib/types';

/** What a page needs to know about the pages it links to. */
export interface LinkedPage {
	path: string;
	title: string;
}

// GitHub alert syntax (> [!NOTE]) rendered as a theme-colored rule with a faint tint
const ALERTS: Record<string, { label: string; classes: string }> = {
	NOTE: { label: 'Note', classes: 'border-surface-400 bg-surface-500/10' },
	TIP: { label: 'Tip', classes: 'border-success-500 bg-success-500/10' },
	IMPORTANT: { label: 'Important', classes: 'border-secondary-500 bg-secondary-500/10' },
	WARNING: { label: 'Warning', classes: 'border-warning-500 bg-warning-500/10' },
	CAUTION: { label: 'Caution', classes: 'border-error-500 bg-error-500/10' }
};
const ALERT_MARKER = /^\[!(\w+)\][ \t]*\n?/;

/** The URL path for a docs page path. The home page's path is ''. */
export const docsHref = (pagePath: string, anchor?: string): string =>
	`/docs${pagePath ? `/${pagePath}` : ''}${anchor ? `#${anchor}` : ''}`;

/** A heading's plain text, as GitHub slugs it: no markup, no HTML escaping. */
const plainText = (tokens: Token[]): string =>
	tokens
		.map((t) => {
			if ('tokens' in t && t.tokens) return plainText(t.tokens);
			return 'text' in t ? t.text : '';
		})
		.join('');

/** Resolve a relative link against the directory of a docs source file. */
const resolveFile = (fromFile: string, target: string): string => {
	const parts = fromFile.split('/').slice(0, -1);
	for (const part of target.split('/')) {
		if (part === '..') parts.pop();
		else if (part !== '.' && part !== '') parts.push(part);
	}
	return parts.join('/');
};

const escapeAttr = (value: string): string =>
	value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * Render a docs page to sanitized HTML.
 *
 * Relative links are resolved against the page's source file: links to other
 * pages become /docs routes, and assets load through /docs/assets. Headings get
 * GitHub-style anchors, which the bot's help links point to.
 */
export const renderPage = (page: DocsPage, pagesByFile: Map<string, LinkedPage>): string => {
	const slugger = new GithubSlugger();

	/** The docs page a relative link points to, if any. */
	const linkedPage = (href: string): { page: LinkedPage; anchor?: string } | null => {
		if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#') || href.startsWith('/')) {
			return null;
		}
		const [target, anchor] = href.split('#');
		const linked = pagesByFile.get(resolveFile(page.file, target));
		return linked ? { page: linked, anchor } : null;
	};

	const resolveHref = (href: string): string => {
		const linked = linkedPage(href);
		if (linked) {
			return docsHref(linked.page.path, linked.anchor);
		}
		if (!/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith('#') && !href.startsWith('/')) {
			const file = resolveFile(page.file, href.split('#')[0]);
			if (file.startsWith('assets/')) {
				return `/docs/${file}`;
			}
		}
		return href;
	};

	const marked: Marked = new Marked({
		renderer: {
			heading({ tokens, depth }) {
				const id = slugger.slug(plainText(tokens));
				return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
			},
			link({ href, title, tokens }) {
				const resolved = resolveHref(href);
				const external = /^https?:/.test(resolved);
				const attrs = [
					`href="${escapeAttr(resolved)}"`,
					title ? `title="${escapeAttr(title)}"` : '',
					external ? 'target="_blank" rel="noopener noreferrer"' : ''
				];
				return `<a ${attrs.filter(Boolean).join(' ')}>${this.parser.parseInline(tokens)}</a>`;
			},
			image({ href, title, text }) {
				const src = escapeAttr(resolveHref(href));
				const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
				return `<img src="${src}" alt="${escapeAttr(text)}"${titleAttr} loading="lazy" />`;
			},
			paragraph({ tokens }) {
				const [only] = tokens;
				if (tokens.length !== 1) {
					return false;
				}

				// A paragraph holding only an image is a figure, with its title as the caption
				if (only.type === 'image') {
					const { href, title, text } = only as Tokens.Image;
					const src = escapeAttr(resolveHref(href));
					const caption = title ? `<figcaption>${escapeAttr(title)}</figcaption>` : '';
					return `<figure><img src="${src}" alt="${escapeAttr(text)}" loading="lazy" />${caption}</figure>\n`;
				}

				// A paragraph holding only a link to another page is a card, labeled with
				// the page's title unless the link already says it
				const linked = only.type === 'link' ? linkedPage((only as Tokens.Link).href) : null;
				if (linked) {
					const { tokens: inner } = only as Tokens.Link;
					const text = this.parser.parseInline(inner);
					const label =
						plainText(inner) === linked.page.title
							? ''
							: `<span class="${DOCS_CARD_CLASSES.label}">${escapeAttr(linked.page.title)}</span>`;
					const href = escapeAttr(docsHref(linked.page.path, linked.anchor));
					return `<a href="${href}" class="${DOCS_CARD_CLASSES.card} my-[1.25em]">${label}<span class="${DOCS_CARD_CLASSES.title}">${text}</span></a>\n`;
				}
				return false;
			},
			blockquote({ text }: Tokens.Blockquote) {
				const alert = ALERTS[text.match(ALERT_MARKER)?.[1] ?? ''];
				if (!alert) {
					return false;
				}
				const body = this.parser.parse(marked.lexer(text.replace(ALERT_MARKER, '')));
				// The rule's color shows the kind; screen readers get its name
				return `<div class="docs-alert rounded-r-base border-l-4 px-4 py-3 ${alert.classes}" role="note" aria-label="${alert.label}">${body}</div>\n`;
			}
		}
	});

	// Tables go in a panel that scrolls sideways when they're too wide for the screen
	const html = (marked.parse(page.markdown, { async: false }) as string)
		.replaceAll('<table>', '<div class="docs-table"><table>')
		.replaceAll('</table>', '</table></div>');
	return DOMPurify.sanitize(html, { ADD_ATTR: ['target'] });
};
