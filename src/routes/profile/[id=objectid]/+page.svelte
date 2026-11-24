<script lang="ts">
	import { page } from '$app/state';
	import type { CharacterData } from '$lib/types';
	import PublicCharacterView from '$lib/components/characters/view/PublicCharacterView.svelte';
	import Meta from '$lib/components/layout/Meta.svelte';

	const characterData: CharacterData = page.data.characterData;
	// The first image, or else the site's
	const ogImage = $derived(characterData.character.profile.images[0]);
</script>

<Meta
	title="{characterData.character.name} | Inconnu"
	description="{characterData.character.name} - A {characterData.character
		.splat} character for Vampire: The Masquerade 5th Edition on inconnu.app"
	image={ogImage}
	type="profile"
/>

<PublicCharacterView {characterData} />
