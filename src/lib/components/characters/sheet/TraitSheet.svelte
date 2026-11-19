<script lang="ts">
	import type { Splat, Trait } from '$lib/types';

	import TraitColumn from './TraitColumn.svelte';
	import TraitSection from './TraitSection.svelte';

	interface ComponentProps {
		traits: Trait[];
		splat: Splat;
		editing: boolean;
	}
	let { traits = $bindable(), splat, editing }: ComponentProps = $props();

	const hasDisciplines = $derived(traits.some((trait) => trait.type === 'discipline'));
	const hasCustomTraits = $derived(traits.some((trait) => trait.type === 'custom'));
</script>

<div class="flex flex-col gap-3">
	<!-- Attributes don't take specialties -->
	<TraitSection
		title="Attributes"
		cat="attribute"
		subs={['physical', 'social', 'mental']}
		bind:traits
		{editing}
		allowsSubtraits={false}
	/>
	<TraitSection
		title="Skills"
		cat="skill"
		subs={['physical', 'social', 'mental']}
		bind:traits
		{editing}
		allowsSubtraits={true}
	/>

	{#if hasDisciplines || hasCustomTraits || editing}
		<h2 class="h2 heading-ornate font-display text-xl tracking-[0.02em] uppercase">Advantages</h2>
		<div class="flex flex-col gap-3 sm:flex-row">
			{#if splat != 'mortal'}
				<TraitColumn
					name="Disciplines"
					cat="discipline"
					bind:traits
					{editing}
					addable={true}
					allowsSubtraits={true}
				/>
			{/if}

			<TraitColumn
				name="Custom Traits"
				cat="custom"
				bind:traits
				{editing}
				addable={true}
				addLabel="Custom Trait"
				allowsSubtraits={true}
			/>
		</div>
	{/if}
</div>
