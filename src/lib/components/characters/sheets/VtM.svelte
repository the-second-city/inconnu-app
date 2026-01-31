<script lang="ts">
	import type { Character } from '$lib/types';

	import WoD from './WoD.svelte';
	import TraitColumn from './components/TraitColumn.svelte';
	import Vampirism from './components/wod/Vampirism.svelte';

	interface ComponentProps {
		character: Character;
		editing: boolean;
	}

	let { character = $bindable(), editing }: ComponentProps = $props();
</script>

<WoD bind:character {editing}>
	{#snippet trackers()}
		<!--
		<Vampirism bind:character {editing} />
		-->
	{/snippet}

	{#snippet extraAdvantages()}
		<TraitColumn
			name="Disciplines"
			cat="advantages"
			sub="disciplines"
			plural="disciplines"
			bind:traits={character.traits!}
			{editing}
			addable={true}
			allowsSubtraits={false}
		/>
	{/snippet}
</WoD>
