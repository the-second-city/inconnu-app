<script lang="ts">
	import { page } from '$app/state';
	import type { CharacterData } from '$lib/types';

	import CharHeader from '$lib/components/characters/CharHeader.svelte';
	import CharProfile from '$lib/components/characters/CharProfile.svelte';

	const characterData: CharacterData = page.data.characterData;
</script>

<svelte:head>
	<title>{characterData.character.name} | inconnu.app</title>
</svelte:head>

<CharHeader
	name={characterData.character.name}
	images={characterData.character.profile.images}
	guild={characterData.guild}
	owner={characterData.owner}
	spc={characterData.spc}
/>

<div class="container mx-auto mt-8">
	<CharProfile
		name={characterData.character.name}
		profile={characterData.character.profile}
		splat={characterData.character.splat}
		editing={false}
	/>
</div>
