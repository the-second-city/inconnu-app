<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { ChevronLeft } from '@lucide/svelte';

	import type { Guild, OwnerData } from '$lib/types';

	interface ComponentProps {
		name: string;
		images: string[];
		guild: Guild | null;
		owner?: OwnerData | null;
		spc?: boolean;
		backUrl?: string;
	}

	let { name, images, guild, owner, spc = false, backUrl }: ComponentProps = $props();

	const metadata = $derived.by(() => {
		const items: { name: string; icon: string | null; isSpc?: boolean }[] = [];
		if (guild) items.push({ name: guild.name, icon: guild.icon });
		if (owner) items.push({ name: owner.name, icon: owner.icon });
		if (spc) items.push({ name: 'SPC', icon: null, isSpc: true });
		return items;
	});
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

		{#if metadata.length > 0}
			<div class="flex justify-end">
				<h6 class="text-surface-800-200 flex items-center gap-3 italic">
					{#each metadata as item, i}
						{#if i > 0 && !item.isSpc}<span class="opacity-60">•</span>{/if}
						{#if item.isSpc}
							<span class="badge preset-filled-surface-500 text-xs uppercase">{item.name}</span>
						{:else}
							{item.name}
							<Avatar src={item.icon ?? undefined} name={item.name} size="size-6" />
						{/if}
					{/each}
				</h6>
			</div>
		{/if}
	</div>
</div>
