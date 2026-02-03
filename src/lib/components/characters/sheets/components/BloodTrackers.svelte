<script lang="ts">
	import type { Character } from '$lib/types';

	import Card from '$lib/components/Card.svelte';
	import EmptyHunger from './hunger/Empty.svelte';
	import FilledHunger from './hunger/Filled.svelte';

	interface ComponentProps {
		character: Character;
	}

	let { character }: ComponentProps = $props();

	const isThinBlood = $derived(character.splat === 'thin-blood');
	const maxBloodPotency = $derived(isThinBlood ? 2 : 10);
	const bloodPotency = $derived(character.potency || character.blood_potency || 0);
	const hunger = $derived(character.hunger || 0);
</script>

<Card alignment="center" extraClasses="px-2 h-full justify-center">
	<div class="grid grid-cols-[120px_1fr] gap-2">
		<!-- Blood Potency -->
		<div>Blood Potency</div>
		<div class="flex items-center gap-1">
			{#each Array(maxBloodPotency) as _, i}
				<div
					class="h-3 w-3 rounded-full border-2"
					class:bg-red-500={i < bloodPotency}
					class:border-red-500={i < bloodPotency}
					class:border-red-300={i >= bloodPotency}
				></div>
			{/each}
		</div>

		<!-- Hunger -->
		<div>Hunger</div>
		<div class="flex items-center gap-1">
			{#each Array(5) as _, i}
				{#if i < hunger}
					<FilledHunger size={20} />
				{:else}
					<EmptyHunger size={20} />
				{/if}
			{/each}
		</div>
	</div>
</Card>
