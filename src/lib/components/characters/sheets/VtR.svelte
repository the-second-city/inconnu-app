<script lang="ts">
	import type { Character } from '$lib/types';

	import CofD from './CofD.svelte';
	import Vitae from './components/cofd/Vitae.svelte';
	import TraitColumn from './components/TraitColumn.svelte';

	interface ComponentProps {
		character: Character;
		editing: boolean;
	}

	let { character = $bindable(), editing }: ComponentProps = $props();
</script>

<CofD bind:character {editing}>
	{#snippet inner()}
		<Vitae bind:character {editing} />

		<TraitColumn
			name="Disciplines"
			cat="special"
			sub="disciplines"
			bind:traits={character.traits!}
			{editing}
			allowsSubtraits={false}
			addable={true}
			plural="disciplines"
		/>

		<TraitColumn
			name="Merits"
			cat="special"
			sub="merits"
			bind:traits={character.traits!}
			{editing}
			allowsSubtraits={false}
			addable={true}
			plural="merits"
		/>
	{/snippet}
</CofD>
