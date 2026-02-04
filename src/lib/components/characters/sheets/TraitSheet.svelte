<script lang="ts">
	import type { Character } from '$lib/types';

	import TraitColumn from './components/TraitColumn.svelte';
	import TraitSection from './components/TraitSection.svelte';

	interface ComponentProps {
		character: Character;
		editing: boolean;
	}
	let { character = $bindable(), editing }: ComponentProps = $props();

	const hasDisciplines = $derived(character.traits.some((trait) => trait.type === 'discipline'));
	const hasCustomTraits = $derived(character.traits.some((trait) => trait.type === 'custom'));
</script>

<div class="flex flex-col gap-3">
	<TraitSection
		title="Attributes"
		cat="attribute"
		subs={['physical', 'social', 'mental']}
		bind:traits={character.traits}
		{editing}
		allowsSubtraits={true}
	/>
	<TraitSection
		title="Skills"
		cat="skill"
		subs={['physical', 'social', 'mental']}
		bind:traits={character.traits}
		{editing}
		allowsSubtraits={true}
	/>

	{#if hasDisciplines || hasCustomTraits || editing}
		<h2 class="h2 text-2xl uppercase">Advantages</h2>
		<div class="flex gap-3">
			<TraitColumn
				name="Disciplines"
				cat="discipline"
				bind:traits={character.traits}
				{editing}
				addable={true}
				allowsSubtraits={true}
			/>

			<TraitColumn
				name="Custom Traits"
				cat="custom"
				bind:traits={character.traits}
				{editing}
				addable={true}
				allowsSubtraits={true}
			/>
		</div>
	{/if}
</div>
