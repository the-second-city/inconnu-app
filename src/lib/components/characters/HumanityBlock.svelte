<script lang="ts">
	import type { Snippet } from 'svelte';

	import type { Character } from '$lib/types';
	import Humanity from './sheets/components/Humanity.svelte';

	interface ComponentProps {
		character: Character;
		children?: Snippet; // Under the track, starting at its left edge (Rouse's Stains line)
	}

	let { character, children }: ComponentProps = $props();
</script>

<!-- A modal's Humanity, read-only. The label goes above the track, since beside it, ten boxes don't
     fit a modal; centered as a block, the label (and anything under it) at the track's left edge. -->
<div class="flex justify-center">
	<div class="grid gap-1">
		<Humanity {character} editing={false} />
		{@render children?.()}
	</div>
</div>
