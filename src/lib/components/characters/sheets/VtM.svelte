<script lang="ts">
	import type { Character } from '$lib/types';

	import CharSheet from './CharSheet.svelte';
	import TraitColumn from './components/TraitColumn.svelte';
	import Vampirism from './components/wod/Vampirism.svelte';

	interface ComponentProps {
		character: Character;
		editing: boolean;
	}

	let { character = $bindable(), editing }: ComponentProps = $props();
</script>

<CharSheet bind:character {editing}>
	{#snippet trackers()}
		<!--
		<Vampirism bind:character {editing} />
		-->
	{/snippet}

	{#snippet extraAdvantages()}
		<TraitColumn
			name="Disciplines"
			cat="advantages"
			colNum={0}
			bind:traits={character.traits!}
			{editing}
			allowsSubtraits={false}
		/>
	{/snippet}
</CharSheet>
