<script lang="ts">
	import { fade } from 'svelte/transition';

	import { CirclePlus } from '@lucide/svelte';

	import type { Trait } from '$lib/types';
	import { isValidTraitName, normalize } from '$lib';

	import Card from '$lib/components/Card.svelte';
	import TraitSelector from './TraitSelector.svelte';

	type IndexedTrait = { trait: Trait; index: number };

	interface ComponentProps {
		name: string;
		cat: string;
		sub: string;
		traits: Trait[];
		editing: boolean;
		allowsSubtraits: boolean;
		addable?: boolean;
		plural?: string;
	}

	let {
		name,
		cat,
		sub,
		traits = $bindable(),
		editing,
		allowsSubtraits,
		addable = false,
		plural = 'traits'
	}: ComponentProps = $props();

	let indices: number[] = $derived(
		traits
			.map((trait: Trait, index: number) => ({ trait, index }))
			.filter((item: IndexedTrait) => item.trait.category === cat && item.trait.subcategory === sub)
			.map((item: IndexedTrait) => item.index)
	);

	let newTraitName = $state('');
	let normalizedTrait = $derived(normalize(newTraitName));
	let invalidTrait = $derived.by(() => {
		if (normalizedTrait.length === 0) return true;
		if (!isValidTraitName(normalizedTrait)) return true;

		const lowercased = normalizedTrait.toLowerCase();
		const isDuplicate = indices.some(
			(existing) => traits[existing].name.toLowerCase() === lowercased
		);
		return isDuplicate;
	});

	function addTrait() {
		let trait: Trait = {
			name: normalizedTrait,
			rating: 1,
			category: cat,
			subcategory: sub,
			subtraits: []
		};
		traits.push(trait);
		traits.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
		newTraitName = '';
	}
</script>

<Card>
	<h3 class="h3 -mt-1 mb-2 text-xl font-semibold uppercase">
		{name}
	</h3>
	{#if indices.length > 0}
		<div class="flex flex-col gap-2">
			{#each indices as index (traits[index].name)}
				<TraitSelector bind:trait={traits[index]} {editing} {allowsSubtraits} />
			{/each}
		</div>
	{:else if !editing}
		<p class="opacity-60"><em>Click "Edit" to add {plural}.</em></p>
	{/if}
	{#if editing && addable}
		<div class="mt-3 flex items-stretch gap-2">
			<input
				type="text"
				bind:value={newTraitName}
				onkeydown={(e) => e.key === 'Enter' && addTrait()}
				placeholder="Add new ..."
				class="input w-52 border"
				class:text-error-500={invalidTrait}
				class:border-error-500={invalidTrait}
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
	{/if}
</Card>
