<script lang="ts">
	import type { Character } from '$lib/types';

	import TraitSheet from '$lib/components/characters/sheets/TraitSheet.svelte';
	import MainTrackers from '$lib/components/characters/sheets/components/MainTrackers.svelte';
	import BloodTrackers from '$lib/components/characters/sheets/components/BloodTrackers.svelte';
	import Vampirism from '$lib/components/characters/sheets/components/wod/Vampirism.svelte';

	interface ComponentProps {
		character: Character;
	}

	let { character = $bindable() }: ComponentProps = $props();

	const isVampire = $derived(character.splat === 'vampire' || character.splat === 'thin-blood');
</script>

<div class="flex flex-col gap-3">
	{#if isVampire}
		<div class="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
			<MainTrackers bind:character editing={false} allowsPathChange={true} />
			<BloodTrackers {character} />
		</div>
	{:else}
		<MainTrackers bind:character editing={false} allowsPathChange={true} />
	{/if}

	<TraitSheet bind:character editing={false} />

	<!--
	<Vampirism bind:character editing={false} />
	-->
</div>
