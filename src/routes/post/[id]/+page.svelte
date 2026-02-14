<script lang="ts">
	import { page } from '$app/state';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { ExternalLink } from '@lucide/svelte';

	import type { Changelog } from '$lib/types';
	import Markdown from '$lib/components/Markdown.svelte';
	import DiffView from '$lib/components/DiffView.svelte';

	const changelog: Changelog = page.data.changelog;

	// History is ordered newest-first from the API
	const history = $derived(changelog.history);
	let selectedIndex = $state(0);

	const selectedEntry = $derived(history[selectedIndex]);
	const previousEntry = $derived(
		selectedIndex < history.length - 1 ? history[selectedIndex + 1] : null
	);

	const isOriginal = $derived(selectedIndex === history.length - 1);

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		}).format(date);
	}

	const deletionWarning = $derived.by(() => {
		if (!changelog.deletion_date) return null;
		const date = new Date(changelog.deletion_date);
		const now = new Date();
		if (date <= now) return 'This post has been deleted.';
		return `This post will be deleted on ${formatDate(changelog.deletion_date)}.`;
	});
</script>

<svelte:head>
	<title>{changelog.character.name} — Rolepost History | inconnu.app</title>
	<meta property="og:title" content={`${changelog.character.name} — Rolepost History | Inconnu`} />
	<meta
		property="og:description"
		content={`Rolepost history for ${changelog.character.name} in #${changelog.channel}`}
	/>
</svelte:head>

<h1 class="h1">Rolepost History</h1>

{#if deletionWarning}
	<div class="card preset-filled-warning-500 p-3 text-center font-semibold">
		{deletionWarning}
	</div>
{/if}

<!-- Post metadata card -->
<div class="card preset-filled-surface-300-700 p-4">
	<div class="flex flex-wrap items-center gap-4">
		<!-- Guild -->
		<div class="flex items-center gap-2">
			<Avatar src={changelog.guild.icon ?? undefined} name={changelog.guild.name} size="size-8" />
			<span class="font-semibold">{changelog.guild.name}</span>
		</div>

		<span class="text-surface-400 hidden sm:inline">|</span>

		<!-- Channel -->
		<span class="opacity-75">#{changelog.channel}</span>

		{#if changelog.poster}
			<span class="text-surface-400 hidden sm:inline">|</span>

			<!-- Owner -->
			<div class="flex items-center gap-2">
				<Avatar
					src={changelog.poster.icon ?? undefined}
					name={changelog.poster.name}
					size="size-8"
				/>
				<span class="opacity-75">{changelog.poster.name}</span>
			</div>
		{/if}

		<span class="text-surface-400 hidden sm:inline">|</span>

		<!-- Character -->
		<span class="font-semibold">{changelog.character.name}</span>

		{#if changelog.url}
			<a
				href={changelog.url}
				target="_blank"
				rel="noopener noreferrer"
				class="btn preset-outlined-primary-500 btn-sm ml-auto hover:brightness-125"
			>
				<ExternalLink size={16} />
				Discord
			</a>
		{/if}
	</div>

	<hr class="border-surface-500 mx-auto my-4" />

	<!-- Revision selector -->
	<div class="flex items-center gap-3">
		<label for="revision-select" class="text-lg font-semibold whitespace-nowrap">Revision</label>
		<select
			id="revision-select"
			bind:value={selectedIndex}
			class="input input-bordered w-full border px-4 py-2"
		>
			{#each history as entry, i}
				<option value={i}>
					{formatDate(entry.date)}{i === history.length - 1 ? ' (Original)' : ''}
				</option>
			{/each}
		</select>
	</div>
</div>

<!-- Content panels -->
<div class="grid gap-4 md:grid-cols-2">
	<!-- Left: selected revision content -->
	<div class="space-y-2">
		<h3 class="h3">Content</h3>
		<div class="card preset-filled-surface-300-700 p-4">
			<div class="max-w-none">
				<Markdown content={selectedEntry.content} />
			</div>
		</div>
	</div>

	<!-- Right: diff against previous revision -->
	<div class="space-y-2">
		<h3 class="h3">Changes</h3>
		<div class="card preset-filled-surface-300-700 overflow-x-auto p-4">
			{#if isOriginal}
				<p class="text-center italic opacity-60">Original post — no previous version.</p>
			{:else if previousEntry}
				<DiffView oldText={previousEntry.content} newText={selectedEntry.content} />
			{/if}
		</div>
	</div>
</div>
