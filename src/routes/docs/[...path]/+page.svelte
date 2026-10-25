<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import type { PageData } from './$types';

	import Meta from '$lib/components/Meta.svelte';
	import DocsNav from '$lib/components/docs/DocsNav.svelte';

	let { data }: { data: PageData } = $props();

	const isHome = $derived(data.page.path === '');
	const title = $derived(isHome ? 'Docs | Inconnu' : `${data.page.title} — Docs | Inconnu`);

	let contentsOpen = $state(false);
	afterNavigate(() => {
		contentsOpen = false;
	});
</script>

<Meta {title} description={data.page.description ?? undefined} />

{#snippet article()}
	<!-- Safe: rendered from the bot's docs and sanitized by DOMPurify on the server -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	<article class="docs prose max-w-none">{@html data.page.html}</article>
{/snippet}

{#if isHome}
	{@render article()}
	<section class="space-y-4">
		<h2 class="h2">Contents</h2>
		<DocsNav nav={data.nav} current={data.page.path} />
	</section>
{:else}
	<div class="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
		<aside class="hidden lg:block">
			<div class="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-2">
				<DocsNav nav={data.nav} current={data.page.path} />
			</div>
		</aside>

		<div class="space-y-4">
			<details bind:open={contentsOpen} class="card preset-outlined-surface-500 p-3 lg:hidden">
				<summary class="cursor-pointer font-semibold">Contents</summary>
				<div class="mt-3">
					<DocsNav nav={data.nav} current={data.page.path} />
				</div>
			</details>
			{@render article()}
		</div>
	</div>
{/if}
