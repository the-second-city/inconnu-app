<script lang="ts">
	import type { Snippet } from 'svelte';

	interface ComponentProps {
		href: string;
		title: string;
		target?: string | null;
		color: string;
		full: boolean;
		children: Snippet<[]>;
	}
	let { href, title, target = null, color, full, children }: ComponentProps = $props();
</script>

<a class="btn {color} hover:brightness-125" class:w-full={full} {href} {title} {target}>
	{@render children()}
</a>
