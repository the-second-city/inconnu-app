<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { EyeOff } from '@lucide/svelte';

	import type { Character, Guild } from '$lib/types';

	interface ComponentProps {
		character: Character;
		guild: Guild | null;
	}

	let { character, guild }: ComponentProps = $props();
</script>

<a
	href="/characters/{character._id}"
	title="View/Edit {character.name}"
	class="card preset-filled-surface-100-900 border-surface-200-800 card-hover divide-surface-200-800 block divide-y overflow-hidden border-[1px] shadow-md hover:scale-101"
>
	{#if character.profile.images.length > 0}
		<header>
			<img src={character.profile.images[0]} class="w-full" alt="banner" />
		</header>
	{/if}
	<article class="space-y-1 p-3">
		<div>
			<h3 class="h3">{character.name}</h3>
		</div>
		<p class="line-clamp-4 opacity-60">
			{#if character.profile.description}
				{character.profile.description}
			{:else}
				<em>{character.name} is a total mystery ...</em>
			{/if}
		</p>
	</article>
	<footer class="bg-surface-50-950/50 flex items-center justify-end gap-2 px-4 py-2">
		<small class="opacity-60">
			{#if guild !== null}
				{guild.name}
			{:else}
				<em>Unknown</em>
			{/if}
		</small>
		{#if guild !== null}
			<Avatar src={guild.icon} name="{guild.name} icon" size="size-6" />
		{:else}
			<Avatar name="icon" size="size-6">
				<EyeOff size={18} />
			</Avatar>
		{/if}
	</footer>
</a>
