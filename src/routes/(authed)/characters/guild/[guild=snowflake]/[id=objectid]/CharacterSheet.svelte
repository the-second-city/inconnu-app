<script lang="ts">
	import { isVampiric } from '$lib/vampire';
	import type { Character, TrackType } from '$lib/types';

	import TraitSheet from '$lib/components/characters/sheets/TraitSheet.svelte';
	import MainTrackers from '$lib/components/characters/sheets/components/MainTrackers.svelte';
	import BloodTrackers from '$lib/components/characters/sheets/components/BloodTrackers.svelte';

	interface ComponentProps {
		character: Character;
		editing: boolean;
		actionable?: boolean; // Outside edit mode, the damage tracks offer actions
		onRouse?: () => void; // Opens the Rouse modal: from Hunger, or a ghoul's Health menu
		onMend?: (type: 'superficial' | 'aggravated', track: TrackType) => void; // Opens the Mend modal
		onTakeDamage?: (track: TrackType) => void; // Opens the damage modal
		onSlake?: () => void; // Opens the Slake modal, from Hunger
		onStain?: () => void; // Opens the Apply Stains modal, from Humanity
		onRemorse?: () => void; // Opens the Remorse modal, from Humanity
	}

	let {
		character = $bindable(),
		editing,
		actionable = false,
		onRouse,
		onMend,
		onTakeDamage,
		onSlake,
		onStain,
		onRemorse
	}: ComponentProps = $props();

	const isVampire = $derived(isVampiric(character.splat));
</script>

<div class="flex flex-col gap-3">
	{#if isVampire}
		<div class="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
			<MainTrackers
				bind:character
				{editing}
				{actionable}
				{onMend}
				{onTakeDamage}
				{onStain}
				{onRemorse}
			/>
			<BloodTrackers bind:character {editing} {onRouse} {onSlake} />
		</div>
	{:else}
		<MainTrackers
			bind:character
			{editing}
			{actionable}
			{onRouse}
			{onMend}
			{onTakeDamage}
			{onStain}
			{onRemorse}
		/>
	{/if}

	<TraitSheet bind:traits={character.traits} splat={character.splat} {editing} />
</div>
