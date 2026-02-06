<script lang="ts">
	import { page } from '$app/state';
	import type { BaseProfile } from '$lib/types';

	import CharHeader from '$lib/components/characters/CharHeader.svelte';
	import CharProfile from '$lib/components/characters/CharProfile.svelte';

	const profile: BaseProfile = page.data.profile;
</script>

<svelte:head>
	<title>{profile.name} | inconnu.app</title>
</svelte:head>

<CharHeader name={profile.name} images={profile.profile.images} guild={profile.guild} />

<div class="container mx-auto mt-8">
	<CharProfile
		name={profile.name}
		profile={profile.profile}
		splat={profile.splat}
		editing={false}
	/>
</div>
