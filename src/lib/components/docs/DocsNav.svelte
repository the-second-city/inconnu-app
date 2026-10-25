<script lang="ts">
	import { resolve } from '$app/paths';
	import { ExternalLink } from '@lucide/svelte';

	import type { DocsNavItem, DocsNavSection } from '$lib/types';

	interface ComponentProps {
		nav: DocsNavSection[];
		current: string; // The current page's path
	}
	let { nav, current }: ComponentProps = $props();
</script>

{#snippet items(list: DocsNavItem[])}
	<ul class="space-y-1">
		{#each list as item (item.path ?? item.url)}
			<li>
				{#if item.path !== null}
					<a
						href={resolve('/docs/[...path]', { path: item.path })}
						class="block hover:brightness-125"
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
						class="flex items-center gap-1 hover:brightness-125"
					>
						{item.title}
						<ExternalLink size={14} class="opacity-60" />
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/if}
				{#if item.children.length > 0}
					<div class="border-surface-700 mt-1 ml-1 border-l pl-3">
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
