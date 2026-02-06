<script lang="ts">
	import { page } from '$app/state';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { ChevronLeft } from '@lucide/svelte';
	import type { ProfileWithOwner } from '$lib/types';
	import CharCard from '$lib/components/CharCard.svelte';
	import CharacterGrid from '../../CharacterGrid.svelte';

	const profiles: ProfileWithOwner[] = page.data.profiles;

	// Extract guild info from first profile (they all share the same guild)
	const guild = profiles.length > 0 ? profiles[0].character.guild : null;
</script>

<svelte:head>
	<title>{guild?.name || 'Guild'} Characters | inconnu.app</title>
</svelte:head>

{#if guild}
	<div class="mb-4 flex items-center gap-2">
		<a href="/characters" class="opacity-60 transition-opacity hover:opacity-100">
			<ChevronLeft size={32} />
		</a>
		<h1 class="h1 flex items-center gap-4">
			<Avatar src={guild.icon ?? undefined} name="{guild.name} icon" />
			{guild.name}
		</h1>
	</div>
{/if}

{#if profiles.length > 0}
	<CharacterGrid items={profiles}>
		{#snippet children(profile: ProfileWithOwner)}
			<CharCard character={profile.character} owner={profile.owner_data} />
		{/snippet}
	</CharacterGrid>
{:else}
	<div class="card preset-tonal mx-auto mt-12 max-w-md space-y-4 p-8 text-center">
		<p class="text-xl">No characters found</p>
		<p class="text-surface-200">This guild doesn't have any characters yet.</p>
	</div>
{/if}
