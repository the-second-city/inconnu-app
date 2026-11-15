<script lang="ts">
	import type { Character } from '$lib/types';

	import TraitSheet from '$lib/components/characters/sheets/TraitSheet.svelte';
	import MainTrackers from '$lib/components/characters/sheets/components/MainTrackers.svelte';
	import BloodTrackers from '$lib/components/characters/sheets/components/BloodTrackers.svelte';

	interface ComponentProps {
		character: Character;
		editing: boolean;
		actionable?: boolean; // Outside edit mode, the damage tracks offer actions
	}

	let { character = $bindable(), editing, actionable = false }: ComponentProps = $props();

	const isVampire = $derived(character.splat === 'vampire' || character.splat === 'thin-blood');
</script>

<div class="flex flex-col gap-3">
	{#if isVampire}
		<div class="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
			<MainTrackers bind:character {editing} {actionable} />
			<BloodTrackers bind:character {editing} />
		</div>
	{:else}
		<MainTrackers bind:character {editing} {actionable} />
	{/if}

	<TraitSheet bind:traits={character.traits} splat={character.splat} {editing} />
</div>
