<script lang="ts">
	import type { Snippet } from 'svelte';
	import {
		Popover as SkeletonPopover,
		Portal,
		type PopoverRootProps
	} from '@skeletonlabs/skeleton-svelte';

	interface ComponentProps {
		/** Whether the popover is open; bind to control it */
		open?: boolean;
		/** Called when the popover opens or closes */
		onOpenChange?: (open: boolean) => void;
		/** Where the popover sits relative to its trigger */
		positioning?: PopoverRootProps['positioning'];
		/** Classes for the trigger button */
		triggerClass?: string;
		/** The trigger's accessible name, when its content doesn't give it one */
		triggerLabel?: string;
		/** Classes for the popover's panel. A z-index here applies to the whole popover */
		contentClass?: string;
		/** Whether an arrow points at the trigger */
		arrow?: boolean;
		/** The arrow's color as a CSS value; match the panel's background */
		arrowColor?: string;
		/** What's clicked to open the popover */
		trigger: Snippet;
		/** The popover's contents */
		content: Snippet;
	}

	let {
		open = $bindable(false),
		onOpenChange,
		positioning,
		triggerClass = '',
		triggerLabel,
		contentClass = 'card bg-surface-500 p-4',
		arrow = false,
		arrowColor = 'var(--color-surface-500)',
		trigger,
		content
	}: ComponentProps = $props();
</script>

<!--
@component
A popover anchored to a trigger button, rendered at the end of the document so it isn't clipped.
Wraps Skeleton's Popover so its anatomy lives in one place.
-->
<SkeletonPopover
	{open}
	onOpenChange={(e) => {
		open = e.open;
		onOpenChange?.(e.open);
	}}
	{positioning}
>
	<SkeletonPopover.Trigger class={triggerClass} aria-label={triggerLabel}>
		{@render trigger()}
	</SkeletonPopover.Trigger>
	<Portal>
		<SkeletonPopover.Positioner>
			<SkeletonPopover.Content class={contentClass}>
				{#if arrow}
					<SkeletonPopover.Arrow style="--arrow-size: 10px; --arrow-background: {arrowColor};">
						<SkeletonPopover.ArrowTip />
					</SkeletonPopover.Arrow>
				{/if}
				{@render content()}
			</SkeletonPopover.Content>
		</SkeletonPopover.Positioner>
	</Portal>
</SkeletonPopover>
