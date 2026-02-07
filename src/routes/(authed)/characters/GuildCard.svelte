<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import type { Guild } from '$lib/types';

	interface ComponentProps {
		guild: Guild;
	}

	let { guild }: ComponentProps = $props();
</script>

<a
	href="/characters/guild/{guild.id}"
	title="View {guild.name} characters"
	class="card preset-filled-surface-400-600 border-surface-200-800 card-hover flex items-center gap-4 overflow-hidden rounded-full border-[1px] px-4 py-3 shadow-md hover:scale-101"
>
	<Avatar src={guild.icon ?? undefined} name="{guild.name} icon" size="size-10" />
	<h3 class="h4 flex-1">{guild.name}</h3>
</a>
