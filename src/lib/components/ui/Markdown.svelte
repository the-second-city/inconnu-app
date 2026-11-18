<script lang="ts" module>
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	/** Characters a preview renders. Cards clamp to a few lines anyway. */
	export const PREVIEW_LENGTH = 500;

	const renderer = new marked.Renderer();
	renderer.image = () => '';
	renderer.link = ({ tokens }) => renderer.parser.parseInline(tokens);
	// Task lists get a text checkbox, so the sanitizer never has to allow inputs
	renderer.checkbox = ({ checked }) => (checked ? '☑ ' : '☐ ');

	// Previews skip DOMPurify, which is slow on the server (jsdom) and runs once
	// per card. Dropping raw HTML makes marked's output safe on its own: images
	// and links are stripped too, and marked escapes all other text.
	const previewRenderer = new marked.Renderer();
	previewRenderer.image = () => '';
	previewRenderer.html = () => '';
	previewRenderer.link = ({ tokens }) => previewRenderer.parser.parseInline(tokens);

	/** Render a short preview of the content, without raw HTML. */
	const renderPreview = (content: string): string =>
		marked.parse(content.slice(0, PREVIEW_LENGTH), {
			renderer: previewRenderer,
			breaks: true,
			async: false
		});

	// Only what the renderer above produces, plus a few harmless inline tags. Raw HTML
	// in the content can't add styles, images, links, or forms, and it can't use
	// classes to restyle or overlay the page.
	const ALLOWED_TAGS = [
		...['p', 'br', 'hr', 'blockquote', 'pre', 'code'],
		...['strong', 'em', 'del', 's', 'u', 'sub', 'sup'],
		...['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
		...['ul', 'ol', 'li'],
		...['table', 'thead', 'tbody', 'tr', 'th', 'td']
	];
	const ALLOWED_ATTR = ['align', 'start'];

	/** Render the full content, sanitized. */
	const renderFull = (content: string): string =>
		DOMPurify.sanitize(marked.parse(content, { renderer, breaks: true, async: false }), {
			ALLOWED_TAGS,
			ALLOWED_ATTR
		});
</script>

<script lang="ts">
	interface ComponentProps {
		content: string;
		/** Render only the start of the content, for cards. Drops raw HTML. */
		preview?: boolean;
	}

	let { content, preview = false }: ComponentProps = $props();

	const parsed = $derived(preview ? renderPreview(content) : renderFull(content));
</script>

<!-- Safe: full renders are sanitized by DOMPurify against a tag allowlist;
	previews drop raw HTML, and the renderers strip images and links -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html parsed}
