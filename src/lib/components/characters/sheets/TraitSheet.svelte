<script lang="ts">
	import type { Character } from '$lib/types';

	import TraitColumn from './components/TraitColumn.svelte';
	import TraitSection from './components/TraitSection.svelte';

	interface ComponentProps {
		character: Character;
		editing: boolean;
	}
	let { character = $bindable(), editing }: ComponentProps = $props();

	const hasCustomTraits = $derived(character.traits.some((trait) => trait.type === 'custom'));
	const hasAdvantages = $derived(character.traits.some((trait) => trait.type === 'advantages'));
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

	{#if hasCustomTraits}
		<TraitColumn
			name="Custom Traits"
			cat="custom"
			bind:traits={character.traits}
			{editing}
			allowsSubtraits={true}
		/>
	{/if}

	{#if hasAdvantages}
		<TraitColumn
			name="Disciplines"
			cat="advantages"
			bind:traits={character.traits}
			{editing}
			allowsSubtraits={false}
		/>
	{/if}
</div>
