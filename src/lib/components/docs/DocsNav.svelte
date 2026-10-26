<script lang="ts">
	import { resolve } from '$app/paths';
	import { ChevronRight, ExternalLink } from '@lucide/svelte';
	import { SvelteSet } from 'svelte/reactivity';

	import type { DocsNavItem, DocsNavSection } from '$lib/types';

	interface ComponentProps {
		nav: DocsNavSection[];
		current: string; // The current page's path
		storageKey: string; // Where this copy remembers its open sections for the session
	}
	let { nav, current, storageKey }: ComponentProps = $props();

	// Sections the reader opened or closed. Anything else is open only if it
	// contains the current page.
	const opened = new SvelteSet<string>();
	const closed = new SvelteSet<string>();

	/** Whether an item is the current page or contains it. */
	const containsCurrent = (item: DocsNavItem): boolean =>
		item.path === current || item.children.some(containsCurrent);

	/** Whether an item's sub-pages show. */
	const isOpen = (item: DocsNavItem): boolean =>
		item.path !== null &&
		!closed.has(item.path) &&
		(opened.has(item.path) || containsCurrent(item));

	/** Open or close a section without leaving the page. */
	const toggle = (item: DocsNavItem) => {
		if (item.path === null) return;
		if (isOpen(item)) {
			opened.delete(item.path);
			closed.add(item.path);
		} else {
			closed.delete(item.path);
			opened.add(item.path);
		}
	};

	/** Every item, at any depth. */
	const allItems = (items: DocsNavItem[]): DocsNavItem[] =>
		items.flatMap((item) => [item, ...allItems(item.children)]);

	// Arriving at a page opens its sections, even ones the reader closed earlier,
	// and they stay open after the reader moves on
	$effect(() => {
		for (const item of nav.flatMap((section) => allItems(section.items))) {
			if (item.path !== null && item.children.length > 0 && containsCurrent(item)) {
				closed.delete(item.path);
				opened.add(item.path);
			}
		}
	});

	// Restore this session's open sections, then keep them saved. Storage can be
	// unavailable (e.g. private browsing), in which case they last until reload.
	let restored = false;
	$effect(() => {
		if (!restored) {
			restored = true;
			try {
				const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? '{}');
				for (const path of saved.opened ?? []) opened.add(path);
				for (const path of saved.closed ?? []) closed.add(path);
			} catch {
				// Nothing saved, or no storage
			}
		}
		const state = JSON.stringify({ opened: [...opened], closed: [...closed] });
		try {
			sessionStorage.setItem(storageKey, state);
		} catch {
			// No storage
		}
	});
</script>

{#snippet items(list: DocsNavItem[])}
	<ul class="space-y-1">
		{#each list as item (item.path ?? item.url)}
			<li>
				{#if item.path !== null}
					<div
						class="hover:bg-surface-500/35 rounded-base -mx-2 flex items-center transition-colors {item.path ===
						current
							? 'bg-surface-500/20'
							: ''}"
					>
						<a
							href={resolve('/docs/[...path]', { path: item.path })}
							class="flex-1 py-0.5 pl-2 {item.children.length > 0 ? '' : 'pr-2'}"
							class:text-primary-400={item.path === current}
							class:font-semibold={item.path === current}
							aria-current={item.path === current ? 'page' : undefined}
						>
							{item.title}
						</a>
						{#if item.children.length > 0}
							<button
								type="button"
								class="hover:bg-surface-500/40 rounded-base mr-0.5 p-1 transition-colors"
								aria-expanded={isOpen(item)}
								aria-label="{isOpen(item) ? 'Collapse' : 'Expand'} {item.title}"
								onclick={() => toggle(item)}
							>
								<ChevronRight
									size={16}
									class="opacity-60 transition-transform {isOpen(item) ? 'rotate-90' : ''}"
									aria-hidden="true"
								/>
							</button>
						{/if}
					</div>
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
