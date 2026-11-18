<script lang="ts">
	import type { Snippet } from 'svelte';

	import HungerDrops from './HungerDrops.svelte';

	interface ComponentProps {
		children: Snippet; // The Rouse dice
		show: boolean; // The dice have given way to the Hunger they left
		before: number; // Hunger before the Rouse
		after: number; // Hunger after it
	}

	let { children, show, before, after }: ComponentProps = $props();

	const LAYER = 'col-start-1 row-start-1 transition-opacity duration-500';
</script>

<!-- The Rouse dice, then, a moment after they're in, the Hunger they left (gains pulsing), in the
     same place: stacked in one grid cell, crossfading. The drops are there (unseen) from the start,
     so the height holds. -->
<div class="grid items-center">
	<div class={[LAYER, show && 'opacity-0']}>
		{@render children()}
	</div>
	<div class={[LAYER, show ? 'opacity-100' : 'opacity-0']} aria-hidden="true">
		<HungerDrops {before} {after} />
	</div>
</div>
