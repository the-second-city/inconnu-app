<script lang="ts">
	import { page } from '$app/state';
	import type { AuthorizedCharacter } from '$lib/types';
	import CharacterPage from './CharacterPage.svelte';

	const authorizedCharacter: AuthorizedCharacter = page.data.authorizedCharacter;
</script>

{#if authorizedCharacter.character}
	<CharacterPage bind:character={authorizedCharacter.character} guild={authorizedCharacter.guild} />
{:else}
	<div class="card preset-tonal mx-auto mt-12 max-w-md space-y-4 p-8 text-center">
		<p class="text-xl">Character not found</p>
		<p class="text-surface-200">This character doesn't exist or you don't have access to it.</p>
		<a href="/characters" class="btn preset-outlined-primary-500 hover:brightness-125">
			Return to Characters
		</a>
	</div>
{/if}
