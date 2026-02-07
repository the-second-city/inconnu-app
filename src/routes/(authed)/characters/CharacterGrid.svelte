<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';

	interface ComponentProps<T> {
		items: T[];
		children: Snippet<[T]>;
	}

	let { items, children }: ComponentProps<T> = $props();

	/**
	 * Reorder an array so a columnar masonry layout will display in row orientation.
	 *
	 * Given [1, 2, 3, 4, 5, 6] with 3 columns, returns [1, 4, 2, 5, 3, 6]
	 * so masonry columns display as:
	 *   1  2  3
	 *   4  5  6
	 */
	const reorderForRowOrientation = <T,>(items: T[], columns: number): T[] => {
		if (columns <= 0 || items.length === 0) return items;

		const rows = Math.ceil(items.length / columns);
		const result: T[] = [];

		for (let col = 0; col < columns; col++) {
			for (let row = 0; row < rows; row++) {
				const index = row * columns + col;
				if (index < items.length) {
					result.push(items[index]);
				}
			}
		}

		return result;
	};

	let columnCount = $state(1);
	let organizedItems = $derived(reorderForRowOrientation(items, columnCount));

	$effect(() => {
		if (typeof window === 'undefined') return;

		const updateColumnCount = () => {
			if (window.innerWidth >= 1280) columnCount = 4;
			else if (window.innerWidth >= 1024) columnCount = 3;
			else if (window.innerWidth >= 768) columnCount = 2;
			else columnCount = 1;
		};

		updateColumnCount();
		window.addEventListener('resize', updateColumnCount);

		return () => window.removeEventListener('resize', updateColumnCount);
	});
</script>

<div class="columns-1 gap-3 md:columns-2 lg:columns-3 xl:columns-4">
	{#each organizedItems as item}
		<div class="mb-3 break-inside-avoid">
			{@render children(item)}
		</div>
	{/each}
</div>
