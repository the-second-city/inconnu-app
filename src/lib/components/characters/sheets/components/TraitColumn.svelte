<script lang="ts">
	import { fade } from 'svelte/transition';

	import { CirclePlus } from '@lucide/svelte';

	import type { Trait } from '$lib/types';
	import { isValidTraitName, normalize } from '$lib';
	import { getTraitOrder } from '$lib/data/trait-order';

	import Card from '$lib/components/Card.svelte';
	import TraitSelector from './TraitSelector.svelte';

	interface ComponentProps {
		name: string;
		cat: string;
		traits: Trait[];
		editing: boolean;
		allowsSubtraits: boolean;
		addable?: boolean;
		addLabel?: string | null;
	}

	let {
		name,
		cat,
		traits = $bindable(),
		editing,
		allowsSubtraits,
		addable = false,
		addLabel = null
	}: ComponentProps = $props();

	const placeholder = $derived(
		`Add new ${addLabel ?? cat.charAt(0).toUpperCase() + cat.slice(1)} ...`
	);

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

	let newTraitName = $state('');
	let normalizedTrait = $derived(normalize(newTraitName));
	let traitError = $derived.by(() => {
		if (normalizedTrait.length === 0) return null;
		if (normalizedTrait.length > 20) return 'Maximum 20 characters';
		if (!isValidTraitName(normalizedTrait)) return 'Letters, spaces, and underscores only';

		const lowercased = normalizedTrait.toLowerCase();
		const isDuplicate = orderedIndices.some(
			(index) => traits[index].name.toLowerCase() === lowercased
		);
		if (isDuplicate) return 'Trait already exists';
		return null;
	});
	let invalidTrait = $derived(normalizedTrait.length === 0 || traitError !== null);

	function addTrait() {
		let trait: Trait = {
			name: normalizedTrait,
			rating: 1,
			type: cat,
			subtraits: []
		};
		traits.push(trait);
		traits.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
		newTraitName = '';
		console.log(trait);
	}
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
	{#if editing && addable}
		<div class="mt-3 flex items-stretch gap-2">
			<input
				type="text"
				bind:value={newTraitName}
				onkeydown={(e) => e.key === 'Enter' && addTrait()}
				{placeholder}
				class="input min-w-0 flex-1 border"
				class:text-error-500={traitError}
				class:border-error-500={traitError}
				aria-describedby={traitError ? 'trait-error' : undefined}
				transition:fade={{ duration: 100 }}
			/>
			<button
				class="btn preset-filled-secondary-500"
				onclick={addTrait}
				disabled={invalidTrait}
				aria-label="Add trait"
			>
				<CirclePlus />
			</button>
		</div>
		{#if traitError}
			<p id="trait-error" class="text-error-500 mt-1 text-sm">{traitError}</p>
		{/if}
	{/if}
</Card>
