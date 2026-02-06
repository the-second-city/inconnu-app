<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';

	interface ComponentProps<T> {
		items: T[];
		children: Snippet<[T]>;
	}

	let { items, children }: ComponentProps<T> = $props();
</script>

<div class="columns-1 gap-3 md:columns-2 lg:columns-3">
	{#each items as item}
		<div class="mb-3 break-inside-avoid">
			{@render children(item)}
		</div>
	{/each}
</div>
