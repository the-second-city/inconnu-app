<script lang="ts">
	import type { Snippet } from 'svelte';

	type CardAlignment = 'center' | 'leading';

	interface ComponentProps {
		children: Snippet;
		alignment?: CardAlignment;
		extraClasses?: string;
	}
	let { children, alignment = 'leading', extraClasses = '' }: ComponentProps = $props();

	// Skeleton's `card` only brightens links and buttons on hover; this matches it for a div
	const hover = 'transition-all hover:brightness-95 dark:hover:brightness-110';

	let classes = $derived(
		alignment == 'center'
			? `card panel-gothic ${hover} flex flex-grow flex-col items-center overflow-hidden px-4 py-4 ${extraClasses}`
			: `card panel-gothic ${hover} block min-w-0 sm:min-w-[300px] flex-grow overflow-hidden px-4 py-4 ${extraClasses}`
	);
</script>

<div class={classes}>
	{@render children()}
</div>

<style>
	/* A heading's line box adds half its leading above the text, which makes a card's
	   top padding look larger than its side padding. Trim it from a leading heading. */
	div > :global(:is(h1, h2, h3, h4, h5, h6, .h1, .h2, .h3, .h4, .h5, .h6):first-child) {
		margin-top: calc((1em - 1lh) / 2);
	}
</style>
