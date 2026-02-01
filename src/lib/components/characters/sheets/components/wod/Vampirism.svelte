<script lang="ts">
	import type { Character } from '$lib/types';

	import Card from '$lib/components/Card.svelte';
	import RatingSelector from '../RatingSelector.svelte';

	interface ComponentProps {
		character: Character;
		editing: boolean;
	}
	let { character = $bindable(), editing }: ComponentProps = $props();

	const generations = Array.from({ length: 12 }, (_, i) => i + 4);

	function maxBP(generation: number): number {
		if (generation >= 8) {
			return Math.max(15 - (generation - 8), 10);
		}
		return (5 - (generation - 4)) * 10;
	}

	$effect(() => {
		let newMax = maxBP(character.generation!);
		if (newMax !== character.max_bp) {
			character.max_bp = newMax;
			character.blood_pool = Math.min(newMax, character.blood_pool ?? 0);
		}
	});
</script>

<Card>
	<div class="grid grid-cols-[minmax(120px,auto)_1fr] items-center gap-2 px-2">
		Generation
		{#if editing}
			<select
				class="select w-auto border pr-8"
				id="generation"
				bind:value={character.generation}
				aria-label="Select generation"
			>
				{#each generations as generation}
					<option value={generation}>{generation}</option>
				{/each}
			</select>
		{:else}
			<span>{character.generation}</span>
		{/if}
		<span class="whitespace-nowrap">Blood Pool</span>
		{#key character.max_bp}
			<RatingSelector
				bind:rating={character.blood_pool!}
				max={character.max_bp ?? 10}
				{editing}
				allowsSubtraits={false}
			/>
		{/key}
	</div>
</Card>
