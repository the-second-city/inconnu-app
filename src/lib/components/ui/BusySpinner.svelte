<script lang="ts">
	import { Loader2 } from '@lucide/svelte';

	interface ComponentProps {
		label: string; // What's happening, for screen readers ("Applying…")
	}

	let { label }: ComponentProps = $props();
</script>

<!-- What a modal shows in place of its content while it submits: a spinner, the size of the Rouse
     countdown's ring, so every action's busy state looks alike -->
<div class="flex justify-center py-6" role="status">
	<div class="flex size-28 items-center justify-center">
		<Loader2 size={56} strokeWidth={1.5} class="text-primary-500 animate-spin" aria-hidden="true" />
	</div>
	<span class="sr-only">{label}</span>
</div>
