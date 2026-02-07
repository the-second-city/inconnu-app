<script lang="ts">
	import { page } from '$app/state';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { ChevronLeft } from '@lucide/svelte';
	import type { CharacterData, Guild } from '$lib/types';
	import CharCard from '$lib/components/CharCard.svelte';
	import CharacterGrid from '../../CharacterGrid.svelte';

	const guild: Guild = page.data.guild;
	const characters: CharacterData[] = page.data.characters;
</script>

<svelte:head>
	<title>{guild.name} Characters | inconnu.app</title>
</svelte:head>

<div class="mb-4 flex items-center gap-2">
	<a href="/characters" class="opacity-60 transition-opacity hover:opacity-100">
		<ChevronLeft size={32} />
	</a>
	<h1 class="h1 flex items-center gap-4">
		<Avatar src={guild.icon ?? undefined} name="{guild.name} icon" />
		{guild.name}
	</h1>
</div>

<CharacterGrid {characters} emptyMessage="{guild.name} has no characters.">
	{#snippet children(data: CharacterData)}
		<CharCard {data} showOwner={true} />
	{/snippet}
</CharacterGrid>
