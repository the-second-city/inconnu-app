<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { EyeOff } from '@lucide/svelte';
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	import type { CharacterData, Character, PublicCharacter } from '$lib/types';

	interface ComponentProps {
		data: CharacterData;
		showOwner: boolean;
	}

	let { data, showOwner }: ComponentProps = $props();

	// Extract character ID based on type - use $derived for reactivity
	const characterId = $derived(
		data.type === 'full'
			? (data.character as Character)._id
			: (data.character as PublicCharacter).id
	);
	const guildId = $derived(data.guild.id);

	// Determine what to show in footer
	const footerLabel = $derived(
		showOwner ? (data.owner ? data.owner.name : data.spc ? 'SPC' : 'Your Own') : data.guild.name
	);

	const footerIcon = $derived(showOwner ? (data.owner?.icon ?? null) : data.guild.icon);
</script>

<a
	href="/characters/guild/{guildId}/{characterId}"
	title="View/Edit {data.character.name}"
	class="card preset-filled-surface-100-900 border-surface-200-800 card-hover divide-surface-200-800 block divide-y overflow-hidden border-[1px] shadow-md hover:scale-101"
>
	<header>
		{#if data.character.profile.images.length > 0}
			<img src={data.character.profile.images[0]} class="w-full" alt="banner" />
		{:else}
			<div
				class="from-surface-700 to-surface-900 flex h-48 items-center justify-center bg-gradient-to-br"
			>
				<img src="/images/wod/vampire-logo.png" alt="Inconnu icon" class="h-40 w-40 opacity-20" />
			</div>
		{/if}
	</header>
	<article class="space-y-1 p-3">
		<div>
			<h3 class="h3">{data.character.name}</h3>
		</div>
		<p class="line-clamp-4 text-sm opacity-60">
			{#if data.character.profile.description}
				{@html marked.parse(DOMPurify.sanitize(data.character.profile.description))}
			{:else}
				<em>{data.character.name} is a total mystery ...</em>
			{/if}
		</p>
	</article>
	<footer class="bg-surface-50-950/50 flex items-center justify-end gap-2 px-4 py-2">
		<small class="opacity-60">{footerLabel}</small>
		{#if footerIcon !== null}
			<Avatar src={footerIcon} name="{footerLabel} icon" size="size-6" />
		{:else}
			<Avatar name="icon" size="size-6">
				<EyeOff size={18} />
			</Avatar>
		{/if}
	</footer>
</a>
