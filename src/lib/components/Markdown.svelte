<script lang="ts" module>
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	const renderer = new marked.Renderer();
	renderer.image = () => '';
	renderer.link = ({ text }) => text;
</script>

<script lang="ts">
	interface ComponentProps {
		content: string;
	}

	let { content }: ComponentProps = $props();

	const parsed = $derived(
		DOMPurify.sanitize(marked.parse(content, { renderer, breaks: true }) as string)
	);
</script>

{@html parsed}
