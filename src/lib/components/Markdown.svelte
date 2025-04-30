<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	interface ComponentProps {
		content: string;
	}

	let { content }: ComponentProps = $props();
</script>

{@html marked.parse(DOMPurify.sanitize(content))}
