<script lang="ts">
	import { page } from '$app/state';
	import type { CharacterData } from '$lib/types';
	import PublicCharacterView from '$lib/components/characters/PublicCharacterView.svelte';

	const characterData: CharacterData = page.data.characterData;
	const ogImage = $derived(
		characterData.character.profile.images.length > 0
			? characterData.character.profile.images[0]
			: '/favicon.png'
	);
</script>

<svelte:head>
	<title>{characterData.character.name} | inconnu.app</title>
	<meta property="og:title" content={`${characterData.character.name} | Inconnu`} />
	<meta
		property="og:description"
		content={`${characterData.character.name} - A ${characterData.character.splat} character for Vampire: The Masquerade 5th Edition on inconnu.app`}
	/>
	<meta property="og:image" content={ogImage} />
	<meta property="og:type" content="profile" />
</svelte:head>

<PublicCharacterView {characterData} />
