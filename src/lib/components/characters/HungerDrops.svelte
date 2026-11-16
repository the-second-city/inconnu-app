<script lang="ts">
	import EmptyHunger from './sheets/components/hunger/Empty.svelte';
	import FilledHunger from './sheets/components/hunger/Filled.svelte';

	interface ComponentProps {
		before: number; // Hunger before the action
		after: number; // Hunger after it
	}

	let { before, after }: ComponentProps = $props();
</script>

<!-- Hunger across the width: the Hunger already there is solid, and the Hunger the action added
     pulses (unless motion is reduced). Screen readers get the change as text. -->
<p class="sr-only">Hunger {before} → {after}</p>
<div class="flex justify-between px-4 py-2" aria-hidden="true">
	{#each Array(5), i (i)}
		{#if i < before}
			<FilledHunger size={44} />
		{:else if i < after}
			<span class="motion-safe:animate-pulse" data-gained>
				<FilledHunger size={44} />
			</span>
		{:else}
			<EmptyHunger size={44} />
		{/if}
	{/each}
</div>
