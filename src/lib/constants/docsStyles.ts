/**
 * Docs link card styling, shared by the previous/next links (a Svelte component)
 * and link cards in rendered docs pages (HTML built on the server)
 */

export const DOCS_CARD_CLASSES = {
	card: 'not-prose border-surface-500 bg-surface-500/10 hover:border-primary-500 rounded-base block border px-4 py-3 no-underline transition-colors',
	label: 'text-surface-200 block font-sans text-sm font-bold',
	title: 'text-primary-400 block text-lg font-semibold'
};
