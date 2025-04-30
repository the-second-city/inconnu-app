<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	interface ComponentProps {
		href: string;
		title: string;
		children: Snippet<[]>;
	}
	let { href, title, children }: ComponentProps = $props();

	let active = $derived(page.url.pathname.includes(href));
</script>

<a
	class="flex items-center gap-2 px-4 py-2 hover:shadow-[0_1px_0_0_currentColor] hover:brightness-125"
	class:active
	{href}
	{title}
>
	{@render children()}
</a>

<style>
	.active {
		@apply shadow-[0_1px_0_0_currentColor] brightness-125;
	}
</style>
