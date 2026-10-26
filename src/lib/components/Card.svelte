<script lang="ts">
	import type { Snippet } from 'svelte';

	type CardAlignment = 'center' | 'leading';

	interface ComponentProps {
		children: Snippet;
		alignment?: CardAlignment;
		extraClasses?: string;
	}
	let { children, alignment = 'leading', extraClasses = '' }: ComponentProps = $props();

	let classes = $derived(
		alignment == 'center'
			? `card bg-surface-200-800/30 border-surface-500 card-hover flex flex-grow flex-col items-center overflow-hidden border-[1px] px-3 py-4 ${extraClasses}`
			: `card bg-surface-200-800/30 border-surface-500 card-hover block min-w-0 sm:min-w-[300px] flex-grow overflow-hidden border-[1px] px-3 py-4 ${extraClasses}`
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
