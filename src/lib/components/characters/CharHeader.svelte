<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { ChevronLeft } from '@lucide/svelte';

	import type { Guild } from '$lib/types';

	interface ComponentProps {
		name: string;
		images: string[];
		guild: Guild | null;
		backUrl?: string;
	}

	let { name, images, guild, backUrl }: ComponentProps = $props();
</script>

<div class="flex flex-wrap items-start justify-between gap-2">
	<div class="relative">
		<h1 class="h1 flex items-center gap-4">
			{#if backUrl}
				<a href={backUrl} class="opacity-60 transition-opacity hover:opacity-100">
					<ChevronLeft size={32} />
				</a>
			{/if}
			{#if images.length > 0}
				<div class="ring-primary-500 rounded-full ring-2">
					<Avatar {name} src={images[0]} />
				</div>
			{/if}
			{name}
		</h1>

		{#if guild}
			<div class="flex justify-end">
				<h6 class="text-surface-800-200 flex items-center gap-4 italic">
					{guild.name}
					<Avatar src={guild.icon ?? undefined} name={guild.name} size="size-6" />
				</h6>
			</div>
		{/if}
	</div>
</div>
