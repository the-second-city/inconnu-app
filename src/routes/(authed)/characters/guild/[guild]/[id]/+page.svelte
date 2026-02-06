<script lang="ts">
	import { error } from '@sveltejs/kit';
	import { page } from '$app/state';
	import type { AuthorizedCharacter } from '$lib/types';
	import CharacterPage from './CharacterPage.svelte';
	import CharHeader from '$lib/components/characters/CharHeader.svelte';
	import CharProfile from '$lib/components/characters/CharProfile.svelte';

	const authorizedCharacter: AuthorizedCharacter = page.data.authorizedCharacter;

	// If we have neither character nor profile, throw 404
	if (!authorizedCharacter.character && !authorizedCharacter.profile) {
		error(404, 'Character not found');
	}
</script>

{#if authorizedCharacter.character}
	<CharacterPage bind:character={authorizedCharacter.character} guild={authorizedCharacter.guild} />
{:else if authorizedCharacter.profile}
	<CharHeader
		name={authorizedCharacter.profile.name}
		images={authorizedCharacter.profile.profile.images}
		guild={authorizedCharacter.profile.guild}
	/>

	<div class="container mx-auto mt-8">
		<CharProfile
			name={authorizedCharacter.profile.name}
			profile={authorizedCharacter.profile.profile}
			splat={authorizedCharacter.profile.splat}
			editing={false}
		/>
	</div>
{/if}
