<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { Portal } from '@skeletonlabs/skeleton-svelte';

	interface ComponentProps {
		/** What to render at the end of the document */
		children: Snippet;
	}

	let { children }: ComponentProps = $props();

	// onMount only runs in the browser, after hydration
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
</script>

<!--
@component
Skeleton's Portal, rendered only after mounting. During SSR, Portal has no document to portal
into, so it renders its children in place; the client then moves them to the end of the
document, and the two don't match, which fails hydration. Rendering nothing until mounted keeps
the server and client in agreement. Use it for popovers and dialogs, which start closed anyway.
-->
{#if mounted}
	<Portal>
		{@render children()}
	</Portal>
{/if}
