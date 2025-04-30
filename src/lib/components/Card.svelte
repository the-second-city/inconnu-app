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
			: `card bg-surface-200-800/30 border-surface-500 card-hover block min-w-[300px] flex-grow overflow-hidden border-[1px] px-3 py-4 ${extraClasses}`
	);
</script>

<div class={classes}>
	{@render children()}
</div>
