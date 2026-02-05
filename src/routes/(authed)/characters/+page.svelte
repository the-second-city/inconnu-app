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

	import type { Character, Guild } from '$lib/types';
	import CharCard from '$lib/components/CharCard.svelte';

	const guilds: Guild[] = page.data.guilds;
	// const characters: Character[] = [];
	const characters: Character[] = page.data.characters;

	/**
	 * Retrieves the Guild a Character belongs to.
	 *
	 * @param character - The Character of interest.
	 * @returns The character's Guild, if found.
	 */
	const guildForChar = (character: Character): Guild | null => {
		for (const guild of guilds) {
			if (guild.id == character.guild) {
				return guild;
			}
		}
		return null;
	};

	/**
	 * Reorder an array so a columnar grid will display in row
	 * orientation.
	 *
	 * @param items - The items to reorder.
	 * @param columns - The number of columns for which to reorder.
	 * @returns The reordered array.
	 *
	 * Given 1 2 3 4 5 6, will return 1 4 2 5 3 6, enabling desired
	 * display:
	 *
	 *   1 2 3
	 *   4 5 6
	 */
	const reorderForRowOrientation = <T,>(items: T[], columns: number): T[] => {
		if (columns <= 0) {
			throw new Error('Number of columns must be positive');
		}
		if (items.length === 0) {
			return [];
		}

		const rows = Math.ceil(items.length / columns);
		const result: T[] = [];

		for (let col = 0; col < columns; col++) {
			for (let row = 0; row < rows; row++) {
				const index = row * columns + col;
				if (index < items.length) {
					result.push(items[index]);
				}
			}
		}

		return result;
	};

	let columnCount = $state(1);
	let organizedCharacters = $derived(reorderForRowOrientation(characters, columnCount));

	$effect(() => {
		if (typeof window === 'undefined') return;

		const updateColumnCount = () => {
			if (window.innerWidth >= 1280) columnCount = 4;
			else if (window.innerWidth >= 1024) columnCount = 3;
			else if (window.innerWidth >= 768) columnCount = 2;
			else columnCount = 1;
		};

		updateColumnCount();

		window.addEventListener('resize', updateColumnCount);

		return () => window.removeEventListener('resize', updateColumnCount);
	});
</script>

<svelte:head>
	<title>Characters | inconnu.app</title>
</svelte:head>

<h1 class="h1">Your Characters</h1>

{#if characters.length > 0}
	<div class="columns-1 gap-3 md:columns-2 lg:columns-3 xl:columns-4">
		{#each organizedCharacters as character}
			{@const guild = guildForChar(character)}
			<div class="mb-3 break-inside-avoid">
				<CharCard {character} {guild} />
			</div>
		{/each}
	</div>

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
