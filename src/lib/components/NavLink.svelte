<script lang="ts">
	import { page } from '$app/state';
	import type { Pathname } from '$app/types';
	import { resolvePathname } from '$lib/paths';
	import type { Snippet } from 'svelte';

	interface ComponentProps {
		href: Pathname | '/docs'; // /docs is a layout route with no page of its own
		title: string;
		children: Snippet<[]>;
	}
	let { href, title, children }: ComponentProps = $props();

	let active = $derived(page.url.pathname.includes(href));
</script>

<!-- resolvePathname() calls resolve(); the rule only recognizes resolve() itself -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
	class="flex items-center gap-2 px-2 py-2 hover:shadow-[0_1px_0_0_currentColor] hover:brightness-125"
	class:active
	aria-current={active ? 'page' : undefined}
	href={resolvePathname(href)}
	{title}
>
	{@render children()}
</a>

<!-- eslint-enable svelte/no-navigation-without-resolve -->

<style lang="postcss">
	.active {
		@apply shadow-[0_1px_0_0_currentColor] brightness-125;
	}
</style>
