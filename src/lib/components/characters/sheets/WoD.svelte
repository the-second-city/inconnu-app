<script lang="ts">
	import type { Snippet } from 'svelte';

	import type { Character } from '$lib/types';

	import MainTrackers from './components/MainTrackers.svelte';
	import TraitColumn from './components/TraitColumn.svelte';
	import TraitSection from './components/TraitSection.svelte';

	interface ComponentProps {
		character: Character;
		editing: boolean;
		trackers?: Snippet<[]> | null;
		extraAdvantages?: Snippet<[]> | null;
	}
	let {
		character = $bindable(),
		editing,
		trackers = null,
		extraAdvantages = null
	}: ComponentProps = $props();
</script>

<div class="flex flex-col gap-3">
	<TraitSection
		title="Attributes"
		cat="attribute"
		subs={['physical', 'social', 'mental']}
		bind:traits={character.traits!}
		{editing}
		allowsSubtraits={true}
	/>
	<TraitSection
		title="Skills"
		cat="skill"
		subs={['physical', 'social', 'mental']}
		bind:traits={character.traits!}
		{editing}
		allowsSubtraits={true}
	/>

	<div class="flex flex-wrap gap-3">
		<div class="w-full md:w-[300px]">
			<TraitColumn
				name="Custom Traits"
				cat="custom"
				sub="custom"
				bind:traits={character.traits!}
				{editing}
				addable={true}
				allowsSubtraits={true}
			/>
		</div>
		<div class="flex-1">
			<div class="flex flex-col gap-3">
				<MainTrackers bind:character {editing} allowsPathChange={true} />
				{#if trackers}
					{@render trackers()}
				{/if}
			</div>
		</div>
	</div>
</div>
