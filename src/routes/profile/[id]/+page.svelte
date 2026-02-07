<script lang="ts">
	import { page } from '$app/state';
	import type { CharacterData } from '$lib/types';
	import PublicCharacterView from '$lib/components/characters/PublicCharacterView.svelte';

	const characterData: CharacterData = page.data.characterData;
</script>

<svelte:head>
	<title>{characterData.character.name} | inconnu.app</title>
</svelte:head>

<PublicCharacterView {characterData} />
