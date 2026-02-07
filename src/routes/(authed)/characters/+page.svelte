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

	import { Plus } from '@lucide/svelte';

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

{#if characters.length > 0}
	<CharacterGrid items={characters}>
		{#snippet children(data: CharacterData)}
			<CharCard {data} showOwner={false} />
		{/snippet}
	</CharacterGrid>

	<div class="mt-8 flex justify-center">
		<a
			href="/wizard"
			class="btn preset-filled-primary-500 text-lg font-semibold hover:brightness-125"
		>
			<Plus size={24} />
			Embrace a Character
		</a>
	</div>
{:else}
	<div class="card preset-tonal mx-auto mt-12 max-w-md space-y-4 p-8 text-center">
		<p class="text-xl">Your coterie awaits ...</p>
		<p class="text-surface-200">You haven't created any characters yet.</p>
		<a
			href="/wizard"
			class="btn preset-filled-primary-500 text-lg font-semibold hover:brightness-125"
		>
			<Plus size={24} />
			Embrace Your First Character
		</a>
	</div>
{/if}
