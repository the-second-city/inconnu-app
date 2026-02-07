<script lang="ts">
	import { page } from '$app/state';
	import type { CharacterData, Character } from '$lib/types';
	import CharacterPage from './CharacterPage.svelte';
	import PublicCharacterView from '$lib/components/characters/PublicCharacterView.svelte';

	const characterData: CharacterData = page.data.characterData;

	// Type assertion - when type is 'full', character is definitely Character
	let character = $state(
		characterData.type === 'full' ? (characterData.character as Character) : null
	);

	const backUrl = `/characters/guild/${characterData.guild.id}`;
</script>

{#if character}
	<CharacterPage
		bind:character
		guild={characterData.guild}
		owner={characterData.owner}
		spc={characterData.spc}
		{backUrl}
	/>
{:else}
	<PublicCharacterView {characterData} {backUrl} />
{/if}
