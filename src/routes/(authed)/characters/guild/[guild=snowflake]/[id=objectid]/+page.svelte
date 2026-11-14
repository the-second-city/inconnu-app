<script lang="ts">
	import type { Pathname } from '$app/types';
	import type { CharacterData, Character, PublicCharacter } from '$lib/types';
	import CharacterPage from './CharacterPage.svelte';
	import PublicCharacterView from '$lib/components/characters/PublicCharacterView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Derived, so navigating from one character to another (which reuses this component) shows
	// the new one. It comes from the `data` prop rather than `page.data`, which switches to the
	// next route's data before this page is torn down.
	const characterData: CharacterData = $derived(data.characterData);

	// The guild and character this page shows, which key its view
	const pageKey = $derived(
		`${characterData.guild.id}/${
			characterData.type === 'full'
				? (characterData.character as Character)._id
				: (characterData.character as PublicCharacter).id
		}`
	);

	const backUrl: Pathname = $derived(`/characters/guild/${characterData.guild.id}` as const);
</script>

<!-- Keyed on the guild and character, so a new character (or URL) starts fresh page state: its
     own copy, not editing, and the URL it's on. From `data`, not `params`, which (like `page`)
     switch to the next page's values before this one is torn down. -->
{#key pageKey}
	{#if characterData.type === 'full'}
		<CharacterPage
			character={characterData.character as Character}
			guild={characterData.guild}
			owner={characterData.owner}
			spc={characterData.spc}
			{backUrl}
		/>
	{:else}
		<PublicCharacterView {characterData} {backUrl} />
	{/if}
{/key}
