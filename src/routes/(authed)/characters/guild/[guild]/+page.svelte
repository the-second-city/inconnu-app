<script lang="ts">
	import { page } from '$app/state';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { ChevronLeft } from '@lucide/svelte';
	import type { CharacterData } from '$lib/types';
	import CharCard from '$lib/components/CharCard.svelte';
	import CharacterGrid from '../../CharacterGrid.svelte';

	const characters: CharacterData[] = page.data.characters;

	// Extract guild info from first character (they all share the same guild)
	const guild = characters.length > 0 ? characters[0].guild : null;
</script>

<svelte:head>
	<title>{guild?.name || 'Guild'} Characters | inconnu.app</title>
</svelte:head>

{#if guild}
	<div class="mb-4 flex items-center gap-2">
		<a href="/characters" class="opacity-60 transition-opacity hover:opacity-100">
			<ChevronLeft size={32} />
		</a>
		<h1 class="h1 flex items-center gap-4">
			<Avatar src={guild.icon ?? undefined} name="{guild.name} icon" />
			{guild.name}
		</h1>
	</div>
{/if}

{#if characters.length > 0}
	<CharacterGrid items={characters}>
		{#snippet children(data: CharacterData)}
			<CharCard {data} showOwner={true} />
		{/snippet}
	</CharacterGrid>
{:else}
	<div class="card preset-tonal mx-auto mt-12 max-w-md space-y-4 p-8 text-center">
		<p class="text-xl">No characters found</p>
		<p class="text-surface-200">This guild doesn't have any characters yet.</p>
	</div>
{/if}
