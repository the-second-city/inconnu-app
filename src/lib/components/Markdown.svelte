<script lang="ts" module>
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	/** Characters a preview renders. Cards clamp to a few lines anyway. */
	export const PREVIEW_LENGTH = 500;

	const renderer = new marked.Renderer();
	renderer.image = () => '';
	renderer.link = ({ text }) => text;

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

	/** Render the full content, sanitized. */
	const renderFull = (content: string): string =>
		DOMPurify.sanitize(marked.parse(content, { renderer, breaks: true, async: false }));
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

<!-- Safe: full renders are sanitized by DOMPurify; previews drop raw HTML, and
	the renderers strip images and links -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html parsed}
