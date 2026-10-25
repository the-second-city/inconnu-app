<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	import { DOCS_CARD_CLASSES } from '$lib/constants/docsStyles';
	import Meta from '$lib/components/Meta.svelte';
	import DocsNav from '$lib/components/docs/DocsNav.svelte';

	let { data }: { data: PageData } = $props();

	const title = $derived(
		data.page.path === '' ? 'Docs | Inconnu' : `${data.page.title} — Docs | Inconnu`
	);

	let contentsOpen = $state(false);
	afterNavigate(() => {
		contentsOpen = false;
	});
</script>

<Meta {title} description={data.page.description ?? undefined} />

{#snippet pageLink(link: { path: string; title: string }, label: string, align: string)}
	<a
		href={resolve('/docs/[...path]', { path: link.path })}
		class="{DOCS_CARD_CLASSES.card} {align}"
	>
		<span class={DOCS_CARD_CLASSES.label}>{label}</span>
		<span class={DOCS_CARD_CLASSES.title}>{link.title}</span>
	</a>
{/snippet}

<div class="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
	<aside class="border-surface-500 hidden border-r pr-6 lg:block">
		<DocsNav nav={data.nav} current={data.page.path} />
	</aside>

	<div class="space-y-4">
		<details bind:open={contentsOpen} class="card preset-outlined-surface-500 p-3 lg:hidden">
			<summary class="cursor-pointer font-semibold">Contents</summary>
			<div class="mt-3">
				<DocsNav nav={data.nav} current={data.page.path} />
			</div>
		</details>
		<!-- Safe: rendered from the bot's docs and sanitized by DOMPurify on the server -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		<article class="docs prose max-w-none">{@html data.page.html}</article>

		{#if data.previous || data.next}
			<nav aria-label="Previous and next pages" class="grid gap-4 pt-4 sm:grid-cols-2">
				{#if data.previous}
					{@render pageLink(data.previous, 'Previous', 'text-left')}
				{:else}
					<span class="hidden sm:block"></span>
				{/if}
				{#if data.next}
					{@render pageLink(data.next, 'Next', 'text-right')}
				{/if}
			</nav>
		{/if}
	</div>
</div>
