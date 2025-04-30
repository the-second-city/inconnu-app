<script lang="ts">
	import type { Snippet } from 'svelte';

	import type { Character } from '$lib/types';

	import Advantages from './components/wod/Advantages.svelte';
	import MainTrackers from './components/MainTrackers.svelte';
	import TraitColumn from './components/TraitColumn.svelte';
	import TraitSection from './components/TraitSection.svelte';
	import Virtues from './components/wod/Virtues.svelte';

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
		cat="attributes"
		subs={['physical', 'social', 'mental']}
		bind:traits={character.traits!}
		{editing}
		allowsSubtraits={true}
	/>
	<TraitSection
		title="Abilities"
		cat="abilities"
		subs={['talents', 'skills', 'knowledges']}
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

	<h2 class="h2 text-2xl uppercase">Advantages</h2>
	<div class="flex flex-wrap justify-between gap-3">
		<Advantages bind:advantages={character.advantages!} {editing} />
		<TraitColumn
			name="Backgrounds"
			cat="advantages"
			sub="backgrounds"
			plural="backgrounds"
			bind:traits={character.traits!}
			{editing}
			addable={true}
			allowsSubtraits={false}
		/>
		<Virtues bind:virtues={character.virtues!} {editing} />
		{#if extraAdvantages}
			{@render extraAdvantages()}
		{/if}
	</div>
</div>
