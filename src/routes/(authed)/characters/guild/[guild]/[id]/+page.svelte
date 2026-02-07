<script lang="ts">
	import { page } from '$app/state';
	import type { CharacterData, Character } from '$lib/types';
	import CharacterPage from './CharacterPage.svelte';
	import CharHeader from '$lib/components/characters/CharHeader.svelte';
	import CharProfile from '$lib/components/characters/CharProfile.svelte';

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
	<CharHeader
		name={characterData.character.name}
		images={characterData.character.profile.images}
		guild={characterData.guild}
		owner={characterData.owner}
		spc={characterData.spc}
		{backUrl}
	/>

	<div class="container mx-auto mt-8">
		<CharProfile
			name={characterData.character.name}
			profile={characterData.character.profile}
			splat={characterData.character.splat}
			editing={false}
		/>
	</div>
{/if}
