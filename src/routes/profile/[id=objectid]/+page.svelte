<script lang="ts">
	import { page } from '$app/state';
	import type { CharacterData } from '$lib/types';
	import PublicCharacterView from '$lib/components/characters/PublicCharacterView.svelte';
	import Meta from '$lib/components/Meta.svelte';

	const characterData: CharacterData = page.data.characterData;
	const ogImage = $derived(
		characterData.character.profile.images.length > 0
			? characterData.character.profile.images[0]
			: '/favicon.png'
	);
</script>

<Meta
	title="{characterData.character.name} | Inconnu"
	description="{characterData.character.name} - A {characterData.character
		.splat} character for Vampire: The Masquerade 5th Edition on inconnu.app"
	image={ogImage}
	type="profile"
/>

<PublicCharacterView {characterData} />
