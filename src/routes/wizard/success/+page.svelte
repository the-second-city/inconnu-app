<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { ExternalLink } from '@lucide/svelte';
	import { creationInfoStore } from '$lib/stores/CreationStore';
	import type { CreationInfo } from '$lib/stores/CreationStore';

	let characterInfo = $state<CreationInfo | null>(null);

	onMount(() => {
		const unsubscribe = creationInfoStore.subscribe((value) => {
			characterInfo = value;
			if (!characterInfo) {
				// If there's no character data, redirect to home
				goto('/');
			}
		});

		return unsubscribe;
	});
</script>

<svelte:head>
	<title>Character Created | inconnu.app</title>
</svelte:head>

<div class="card preset-tonal p-5">
	{#if characterInfo}
		<div class="mb-6 flex justify-center">
			<div>
				<h1 class="h1 text-center">{characterInfo.character_name}</h1>
				<h4 class="h4 text-center">HAS BEEN CREATED</h4>
			</div>
		</div>

		<hr class="mb-6 opacity-50" />

		<div class="mb-6 flex flex-col gap-3">
			<a
				href="/characters/guild/{characterInfo.guild.id}/{characterInfo.character_id}"
				class="btn preset-filled-primary-500"
			>
				View now
				<span class="text-sm opacity-75">(requires sign-in)</span>
			</a>
			<a
				href="https://docs.inconnu.app"
				target="_blank"
				rel="noopener noreferrer"
				class="btn preset-filled-secondary-500 flex items-center gap-2"
			>
				Read the documentation
				<ExternalLink size={16} />
			</a>
		</div>

		<div class="mt-6 flex justify-end">
			<h6 class="text-surface-800-200 flex items-center gap-4 italic">
				{characterInfo.guild.name}
				<Avatar
					src={characterInfo.guild.icon ?? undefined}
					name={characterInfo.guild.name}
					size="size-6"
				/>
			</h6>
		</div>
	{:else}
		<p>Loading character data...</p>
	{/if}
</div>
