<script lang="ts">
	import type { Character } from '$lib/types';

	import WoD from './WoD.svelte';
	import Card from '$lib/components/Card.svelte';
	import RatingSelector from './components/RatingSelector.svelte';
	import TraitColumn from './components/TraitColumn.svelte';

	interface ComponentProps {
		character: Character;
		editing: boolean;
	}

	let { character = $bindable(), editing }: ComponentProps = $props();
</script>

<WoD bind:character {editing}>
	{#snippet trackers()}
		<Card>
			<div class="-mt-2 flex flex-col items-center gap-2">
				<h6 class="h6">Blood Pool</h6>
				<RatingSelector
					max={2}
					bind:rating={character.blood_pool!}
					{editing}
					allowsSubtraits={false}
				/>
			</div>
		</Card>
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
