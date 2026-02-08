<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	interface ComponentProps {
		content: string;
	}

	let { content }: ComponentProps = $props();

	marked.use({
		renderer: {
			image() {
				return ''; // Disable image rendering
			},
			link({ text }) {
				return text;
			}
		}
	});
</script>

{@html marked.parse(DOMPurify.sanitize(content))}
