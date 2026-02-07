<script lang="ts">
	import type { CharacterData } from '$lib/types';
	import CharHeader from './CharHeader.svelte';
	import CharProfile from './CharProfile.svelte';

	interface ComponentProps {
		characterData: CharacterData;
		backUrl?: string;
	}

	let { characterData, backUrl }: ComponentProps = $props();
</script>

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
