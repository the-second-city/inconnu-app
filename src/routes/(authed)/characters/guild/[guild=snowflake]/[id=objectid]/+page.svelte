<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { CHARACTER_DEPENDENCY, watchCharacter } from '$lib/api/liveUpdates';
	import type { CharacterData, Character, Constraints, PublicCharacter } from '$lib/types';
	import CharacterPage from './CharacterPage.svelte';
	import PublicCharacterView from '$lib/components/characters/view/PublicCharacterView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Derived, so navigating from one character to another (which reuses this component) shows
	// the new one. It comes from the `data` prop rather than `page.data`, which switches to the
	// next route's data before this page is torn down.
	const characterData: CharacterData = $derived(data.characterData);

	const characterId = $derived(
		characterData.type === 'full'
			? (characterData.character as Character)._id
			: (characterData.character as PublicCharacter).id
	);

	// The guild and character this page shows, which key its view
	const pageKey = $derived(`${characterData.guild.id}/${characterId}`);

	// Live updates: when the character changes (in Discord, say), the loader refetches it. Watched
	// here rather than in the view, so it covers both full and public access, and keeps going when a
	// refetch switches between them. A new character starts a new watch.
	$effect(() => {
		const url = resolve('/api/characters/[id=objectid]/events', { id: characterId });
		return watchCharacter(url, () => {
			// A failed refetch shows itself (the error page); there's nothing more to do here
			invalidate(CHARACTER_DEPENDENCY).catch(() => {});
		});
	});

	const backUrl: Pathname = $derived(`/characters/guild/${characterData.guild.id}` as const);

	// The tracker actions. Anyone with full access (the owner or a Storyteller, the only viewers of
	// this page's full view) may deal damage; Rouse and Mend are for the character's owner, or for an
	// SPC, whose full access only Storytellers have: Storytellers can't roll for other players. The
	// API enforces the same. Ownership is `owner.id`, not the character's own `user`, which the API
	// sends as a JSON number: a Discord ID is past Number.MAX_SAFE_INTEGER, so it arrives rounded.
	const actionable = true;
	const ownerActions = $derived(
		characterData.spc || characterData.owner?.id === data.session?.user?.id
	);
</script>

<!-- Keyed on the guild and character, so a new character (or URL) starts fresh page state: its
     own copy, not editing, and the URL it's on. From `data`, not `params`, which (like `page`)
     switch to the next page's values before this one is torn down. -->
{#key pageKey}
	{#if characterData.type === 'full'}
		<!-- Full access means the owner or a Storyteller, who may edit -->
		<CharacterPage
			character={characterData.character as Character}
			constraints={data.constraints as Constraints}
			guild={characterData.guild}
			owner={characterData.owner}
			spc={characterData.spc}
			{backUrl}
			editable
			{actionable}
			{ownerActions}
		/>
	{:else}
		<PublicCharacterView {characterData} {backUrl} />
	{/if}
{/key}
