<script lang="ts">
	import type { Character } from '$lib/types';

	import Card from '$lib/components/Card.svelte';
	import EmptyHunger from './hunger/Empty.svelte';
	import FilledHunger from './hunger/Filled.svelte';
	import PipSelector, { type PipState } from './PipSelector.svelte';

	interface ComponentProps {
		character: Character;
		editing?: boolean;
	}

	let { character = $bindable(), editing = false }: ComponentProps = $props();

	// Thin-bloods have 0-2; other vampires 1-10, like the wizard
	const isThinBlood = $derived(character.splat === 'thin-blood');
	const minBloodPotency = $derived(isThinBlood ? 0 : 1);
	const maxBloodPotency = $derived(isThinBlood ? 2 : 10);
</script>

{#snippet potencyPip({ filled, preview }: PipState)}
	<div
		class="h-3 w-3 rounded-full border-2 transition-colors"
		class:bg-red-500={filled || preview}
		class:border-red-500={filled || preview}
		class:border-red-300={!filled && !preview}
		class:opacity-50={preview}
	></div>
{/snippet}

{#snippet hungerPip({ filled, preview }: PipState)}
	{#if filled || preview}
		<span class:opacity-50={preview}><FilledHunger size={20} /></span>
	{:else}
		<EmptyHunger size={20} />
	{/if}
{/snippet}

<Card alignment="center" extraClasses="px-2 h-full justify-center">
	<div class="grid grid-cols-[120px_1fr] items-center gap-2">
		<div>Blood Potency</div>
		<!-- The API sends `potency`; `blood_potency` is the wizard's name for it -->
		<PipSelector
			label="Blood Potency"
			bind:rating={
				() => character.potency ?? character.blood_potency ?? 0,
				(value) => (character.potency = value)
			}
			min={minBloodPotency}
			max={maxBloodPotency}
			{editing}
			pip={potencyPip}
		/>

		<div>Hunger</div>
		<PipSelector
			label="Hunger"
			bind:rating={() => character.hunger ?? 0, (value) => (character.hunger = value)}
			max={5}
			{editing}
			pip={hungerPip}
		/>
	</div>
</Card>
