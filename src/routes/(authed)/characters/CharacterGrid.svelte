<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Plus } from '@lucide/svelte';

	import type { CharacterData } from '$lib/types';
	import { hasProfileContent } from '$lib';

	interface ComponentProps {
		characters: CharacterData[];
		children: Snippet<[CharacterData]>;
		emptyMessage: string;
	}

	let { characters, children, emptyMessage }: ComponentProps = $props();

	/**
	 * Sort characters by:
	 * 1. Has images (highest priority)
	 * 2. Has any profile content
	 * 3. Alphabetically
	 */
	const sortCharacters = (chars: CharacterData[]): CharacterData[] => {
		return [...chars].sort((a, b) => {
			const aHasImages = a.character.profile.images.length > 0;
			const bHasImages = b.character.profile.images.length > 0;

			// Characters with images come first
			if (aHasImages !== bHasImages) {
				return aHasImages ? -1 : 1;
			}

			const aHasProfile = hasProfileContent(a.character.profile);
			const bHasProfile = hasProfileContent(b.character.profile);

			// Then characters with any profile content
			if (aHasProfile !== bHasProfile) {
				return aHasProfile ? -1 : 1;
			}

			// Finally, sort alphabetically (case-insensitive)
			return a.character.name.localeCompare(b.character.name, undefined, {
				sensitivity: 'base'
			});
		});
	};

	/**
	 * Reorder an array so a columnar masonry layout will display in row orientation.
	 *
	 * Given [1, 2, 3, 4, 5, 6] with 3 columns, returns [1, 4, 2, 5, 3, 6]
	 * so masonry columns display as:
	 *   1  2  3
	 *   4  5  6
	 */
	const reorderForRowOrientation = (items: CharacterData[], columns: number): CharacterData[] => {
		if (columns <= 0 || items.length === 0) return items;

		const rows = Math.ceil(items.length / columns);
		const result: CharacterData[] = [];

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
	const sortedItems = $derived(sortCharacters(characters));
	let organizedItems = $derived(reorderForRowOrientation(sortedItems, columnCount));

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

{#if characters.length > 0}
	<div class="columns-1 gap-3 md:columns-2 lg:columns-3 xl:columns-4">
		{#each organizedItems as item}
			<div class="mb-3 break-inside-avoid">
				{@render children(item)}
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
	<div class="card preset-tonal mx-auto mt-12 max-w-md p-8 text-center">
		<p class="text-surface-100">Your coterie awaits ...</p>
		<p class="text-xl">{emptyMessage}</p>
		<a
			href="/wizard"
			class="btn preset-filled-primary-500 mt-6 text-lg font-semibold hover:brightness-125"
		>
			<Plus size={24} />
			Embrace Your First Character
		</a>
	</div>
{/if}
