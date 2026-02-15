<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { ExternalLink, Heart, Image, MessageSquare, Sparkles } from '@lucide/svelte';
	import { creationInfoStore } from '$lib/stores/CreationStore';
	import type { CreationInfo } from '$lib/stores/CreationStore';

	let characterInfo = $state<CreationInfo | null>(null);
	const showSignInWarning = $derived(page.data.session?.user?.id == null);

	onMount(() => {
		const unsubscribe = creationInfoStore.subscribe((value) => {
			characterInfo = value;
			if (!characterInfo) {
				// If there's no character data, redirect to home
				goto(resolve('/'));
			}
		});

		return unsubscribe;
	});
</script>

<svelte:head>
	<title>Character Created | Inconnu</title>
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
				href={resolve('/characters/guild/[guild]/[id]', {
					guild: characterInfo.guild.id,
					id: characterInfo.character_id
				})}
				class="btn preset-filled-primary-500"
			>
				View now
				{#if showSignInWarning}
					<span class="text-sm opacity-75">(requires sign-in)</span>
				{/if}
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

{#if characterInfo != null}
	<div class="card preset-tonal p-6">
		{#if characterInfo.has_premium}
			<!-- Non-Patron Card -->
			<div class="flex items-start gap-4">
				<div class="text-primary-500 mt-1">
					<Heart size={24} />
				</div>
				<div class="flex-1">
					<h4 class="h4 mb-3">Support Inconnu</h4>
					<p class="text-surface-900-100 mb-4">
						Unlock premium features and help keep Inconnu running. Patrons get:
					</p>
					<ul class="mb-4 space-y-2 text-sm">
						<li class="flex items-center gap-2">
							<Image size={16} class="text-primary-500" />
							<span>Custom character images</span>
						</li>
						<li class="flex items-center gap-2">
							<MessageSquare size={16} class="text-primary-500" />
							<span>Rolepost system for immersive storytelling</span>
						</li>
					</ul>
					<a
						href="https://patreon.com/tiltowait"
						target="_blank"
						rel="noopener noreferrer"
						class="btn preset-filled-success-50-950 flex w-fit items-center gap-2"
						title="Become a Patron"
					>
						<img src="/images/logos/patreon.webp" class="size-4" alt="Patreon logo" />
						Become a Patron
					</a>
				</div>
			</div>
		{:else}
			<!-- Patron Card -->
			<div class="flex items-start gap-4">
				<div class="text-primary-500 mt-1">
					<Sparkles size={24} />
				</div>
				<div class="flex-1">
					<h4 class="h4 mb-3">Thank you, Patron!</h4>
					<p class="text-surface-900-100 mb-4">
						Your support keeps Inconnu alive. Here's what you can do:
					</p>
					<ul class="space-y-2 text-sm">
						<li class="flex items-center gap-2">
							<Image size={16} class="text-primary-500" />
							<span><code class="text-xs">/character image upload</code> — Add custom images</span>
						</li>
						<li class="flex items-center gap-2">
							<MessageSquare size={16} class="text-primary-500" />
							<span><code class="text-xs">/post</code> — Create immersive Roleposts</span>
						</li>
					</ul>
					<p class="text-surface-900-100 mt-4 text-sm italic">May your crits never be messy!</p>
				</div>
			</div>
		{/if}
	</div>
{/if}
