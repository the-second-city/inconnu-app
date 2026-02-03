<script lang="ts">
	import type { Trait } from '$lib/types';
	import { getTraitOrder } from '$lib/data/trait-order';

	import Card from '$lib/components/Card.svelte';
	import TraitSelector from './TraitSelector.svelte';

	interface ComponentProps {
		name: string;
		cat: string;
		colNum?: number;
		traits: Trait[];
		editing: boolean;
		allowsSubtraits: boolean;
	}

	let {
		name,
		cat,
		colNum,
		traits = $bindable(),
		editing,
		allowsSubtraits
	}: ComponentProps = $props();

	// Get the defined trait order for this category/subcategory (if it exists)
	const orderedTraitNames = $derived(getTraitOrder(cat, name));

	// Get indices into the main traits array for display, in the correct order
	const orderedIndices: number[] = $derived.by(() => {
		// First, find all traits of this category with their original indices
		const categoryTraits: { trait: Trait; index: number }[] = [];
		traits.forEach((trait, index) => {
			if (trait.type === cat) {
				categoryTraits.push({ trait, index });
			}
		});

		// If we have a defined order, use it to sort
		if (orderedTraitNames) {
			// Create a map from trait name to original index
			const nameToIndex = new Map(categoryTraits.map((item) => [item.trait.name, item.index]));

			// Return indices in the defined order, skipping any that don't exist
			return orderedTraitNames
				.map((name) => nameToIndex.get(name))
				.filter((idx): idx is number => idx !== undefined);
		}

		// Otherwise, return indices in original order (for custom traits, disciplines, etc.)
		return categoryTraits.map((item) => item.index);
	});
</script>

<Card>
	<h3 class="h3 -mt-1 mb-2 text-xl font-semibold uppercase">
		{name}
	</h3>
	{#if orderedIndices.length > 0}
		<div class="flex flex-col gap-2">
			{#each orderedIndices as index (traits[index].name)}
				<TraitSelector bind:trait={traits[index]} {editing} {allowsSubtraits} />
			{/each}
		</div>
	{:else if !editing}
		<p class="opacity-60"><em>No traits in this category.</em></p>
	{/if}
</Card>
