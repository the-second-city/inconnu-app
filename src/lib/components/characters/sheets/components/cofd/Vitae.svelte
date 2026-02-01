<script lang="ts">
	import type { Character } from '$lib/types';

	import Card from '$lib/components/Card.svelte';
	import RatingSelector from '../RatingSelector.svelte';

	interface ComponentProps {
		character: Character;
		editing: boolean;
	}
	let { character = $bindable(), editing }: ComponentProps = $props();

	const potencyMapping: Record<number, number> = {
		0: 10,
		1: 10,
		2: 11,
		3: 12,
		4: 13,
		5: 15,
		6: 20,
		7: 25,
		8: 30,
		9: 50,
		10: 75
	};

	$effect(() => {
		let maxVitae = potencyMapping[character.blood_potency!];
		if (maxVitae !== character.max_vitae) {
			character.max_vitae = maxVitae;
			character.vitae = Math.min(maxVitae, character.vitae ?? 0);
		}
	});
</script>

<Card alignment="center">
	<div class="grid grid-cols-[minmax(120px,auto)_1fr] gap-2">
		<span class="witespace-nowrap">Blood Potency</span>
		<RatingSelector
			bind:rating={character.blood_potency!}
			min={1}
			max={10}
			{editing}
			allowsSubtraits={false}
		/>
		Vitae
		{#key character.max_vitae}
			<RatingSelector
				bind:rating={character.vitae!}
				max={character.max_vitae ?? 0}
				{editing}
				allowsSubtraits={false}
			/>
		{/key}
	</div>
</Card>
