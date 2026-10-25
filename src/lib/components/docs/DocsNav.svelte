<script lang="ts">
	import { resolve } from '$app/paths';
	import { ExternalLink } from '@lucide/svelte';

	import type { DocsNavItem, DocsNavSection } from '$lib/types';

	interface ComponentProps {
		nav: DocsNavSection[];
		current: string; // The current page's path
	}
	let { nav, current }: ComponentProps = $props();

	/** Whether an item is the current page or contains it, so its sub-pages show. */
	const isOpen = (item: DocsNavItem): boolean =>
		item.path === current || item.children.some(isOpen);
</script>

{#snippet items(list: DocsNavItem[])}
	<ul class="space-y-1">
		{#each list as item (item.path ?? item.url)}
			<li>
				{#if item.path !== null}
					<a
						href={resolve('/docs/[...path]', { path: item.path })}
						class="hover:bg-surface-500/35 rounded-base -mx-2 block px-2 py-0.5 transition-colors {item.path ===
						current
							? 'bg-surface-500/20'
							: ''}"
						class:text-primary-400={item.path === current}
						class:font-semibold={item.path === current}
						aria-current={item.path === current ? 'page' : undefined}
					>
						{item.title}
					</a>
				{:else if item.url}
					<!-- eslint-disable svelte/no-navigation-without-resolve -- external link -->
					<a
						href={item.url}
						target="_blank"
						rel="noopener noreferrer"
						class="hover:bg-surface-500/35 rounded-base -mx-2 flex items-center gap-1 px-2 py-0.5 transition-colors"
					>
						{item.title}
						<ExternalLink size={14} class="opacity-60" />
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/if}
				{#if item.children.length > 0 && isOpen(item)}
					<div class="border-surface-700 mt-1 ml-1 border-l pl-4">
						{@render items(item.children)}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<nav aria-label="Documentation" class="space-y-4">
	{#each nav as section, i (i)}
		<div>
			{#if section.title}
				<p class="mb-1 text-sm font-bold tracking-wide uppercase opacity-60">{section.title}</p>
			{:else if i > 0}
				<hr class="hr mb-4" />
			{/if}
			{@render items(section.items)}
		</div>
	{/each}
</nav>
