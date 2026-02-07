<script lang="ts">
	/**
	 * Character Listing Page
	 *
	 * This page displays a grid of the logged-in user's characters.
	 * Clicking one of the character cards leads to the character
	 * manager.
	 *
	 * @see /characters/[id] - Individual character viewer
	 */
	import { page } from '$app/state';

	import type { CharacterData, Guild } from '$lib/types';
	import CharCard from '$lib/components/CharCard.svelte';
	import GuildCard from './GuildCard.svelte';
	import CharacterGrid from './CharacterGrid.svelte';

	const guilds: Guild[] = page.data.guilds;
	const characters: CharacterData[] = page.data.characters;
</script>

<svelte:head>
	<title>Characters | inconnu.app</title>
</svelte:head>

{#if guilds.length > 0}
	<div class="mb-8 flex flex-wrap gap-3">
		{#each guilds as guild}
			<GuildCard {guild} />
		{/each}
	</div>
{/if}

<h1 class="h1">Your Characters</h1>

<CharacterGrid {characters} emptyMessage="You haven't created any characters yet.">
	{#snippet children(data: CharacterData)}
		<CharCard {data} showOwner={false} />
	{/snippet}
</CharacterGrid>
