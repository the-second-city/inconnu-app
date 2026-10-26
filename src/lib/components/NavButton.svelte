<script lang="ts">
	import type { Snippet } from 'svelte';

	interface ComponentProps {
		href: string; // An external URL, or an internal path already resolved by the caller
		title: string;
		target?: string | null;
		color: string;
		full: boolean;
		children: Snippet<[]>;
	}
	let { href, title, target = null, color, full, children }: ComponentProps = $props();
</script>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href is external or resolved by the caller -->
<a class="btn {color} hover:brightness-125" class:w-full={full} {href} {title} {target}>
	{@render children()}
</a>
