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
	 * Distribute items into columns in row-oriented order.
	 * Items are sorted by priority, then distributed left-to-right, top-to-bottom.
	 *
	 * Example with 6 items and 3 columns:
	 *   Item 1  Item 2  Item 3
	 *   Item 4  Item 5  Item 6
	 */
	const distributeIntoColumns = (items: CharacterData[], columns: number): CharacterData[][] => {
		if (columns <= 0 || items.length === 0) return [items];

		const result: CharacterData[][] = Array.from({ length: columns }, () => []);

		// Distribute items in row-oriented order (left-to-right, top-to-bottom)
		items.forEach((item, index) => {
			const columnIndex = index % columns;
			result[columnIndex].push(item);
		});

		return result;
	};

	let columnCount = $state(1);
	const sortedItems = $derived(sortCharacters(characters));
	const columnData = $derived(distributeIntoColumns(sortedItems, columnCount));

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
	<div class="flex gap-3">
		{#each columnData as column}
			<div class="flex flex-1 flex-col gap-3">
				{#each column as item}
					{@render children(item)}
				{/each}
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
