<script lang="ts">
	import type { Trait } from '$lib/types';

	import Card from '$lib/components/Card.svelte';
	import TraitSelector from './TraitSelector.svelte';

	type IndexedTrait = { trait: Trait; index: number };

	interface ComponentProps {
		name: string;
		cat: string;
		colNum: number;
		traits: Trait[];
		editing: boolean;
		allowsSubtraits: boolean;
	}

	let { name, cat, colNum, traits = $bindable(), editing, allowsSubtraits }: ComponentProps =
		$props();

	const filteredTraits: Trait[] = traits.filter((trait: Trait) => trait.type === cat);
	$inspect(filteredTraits);

	const colLen = filteredTraits.length / 3;
	let startIndex = $derived(colNum * colLen);
	let endIndex = $derived(colNum * colLen + colLen);

	let indices: number[] = $derived(
		filteredTraits
			.map((trait: Trait, index: number) => ({ trait, index }))
			.map((item: IndexedTrait) => item.index)
			.slice(startIndex, endIndex)
	);
</script>

<Card>
	<h3 class="h3 -mt-1 mb-2 text-xl font-semibold uppercase">
		{name}
	</h3>
	{#if indices.length > 0}
		<div class="flex flex-col gap-2">
			{#each indices as index (filteredTraits[index].name)}
				<TraitSelector bind:trait={filteredTraits[index]} {editing} {allowsSubtraits} />
			{/each}
		</div>
	{:else if !editing}
		<p class="opacity-60"><em>No traits in this category.</em></p>
	{/if}
</Card>
