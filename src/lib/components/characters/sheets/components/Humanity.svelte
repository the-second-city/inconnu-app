<script lang="ts">
	import { Popover } from '@skeletonlabs/skeleton-svelte';

	import type { Character } from '$lib/types';

	import Empty from './humanity/Empty.svelte';
	import Filled from './humanity/Filled.svelte';
	import Stain from './humanity/Stain.svelte';
	import Degeneration from './humanity/Degeneration.svelte';

	interface ComponentProps {
		character: Character;
		editing: boolean;
	}

	let { character = $bindable(), editing }: ComponentProps = $props();

	let showControls = $state(false);

	const totalBoxes = 10;

	// Default only when missing; 0 is a valid Humanity (and Stains)
	let humanity = $derived(character.humanity ?? 7);
	let stains = $derived(character.stains ?? 0);

	let boxStates = $derived.by(() => {
		const emptyBoxes = totalBoxes - humanity;
		const stainOverflow = Math.max(0, stains - emptyBoxes);
		const normalStains = stains - stainOverflow;

		const filled = humanity - stainOverflow;
		const empty = emptyBoxes - normalStains;
		const degeneration = stainOverflow;

		return {
			filled,
			empty,
			degeneration,
			stains: normalStains
		};
	});

	function incHumanity() {
		if (humanity < 10) character.humanity = humanity + 1;
	}

	function decHumanity() {
		if (humanity > 0) character.humanity = humanity - 1;
	}

	function incStains() {
		if (stains < 10) character.stains = stains + 1;
	}

	function decStains() {
		if (stains > 0) character.stains = stains - 1;
	}
</script>

Humanity

<Popover
	open={showControls}
	onOpenChange={(e) => (showControls = e.open)}
	contentBase="card bg-surface-500 p-4"
	arrow
	arrowBackground="!bg-surface-500 dark:!bg-surface-500"
>
	{#snippet trigger()}
		<div class="flex flex-wrap items-center gap-2">
			{#each Array(boxStates.filled), i (i)}
				<Filled size={20} />
			{/each}
			{#each Array(boxStates.empty), i (i)}
				<Empty size={20} />
			{/each}
			{#each Array(boxStates.degeneration), i (i)}
				<Degeneration size={20} />
			{/each}
			{#each Array(boxStates.stains), i (i)}
				<Stain size={20} />
			{/each}
		</div>
	{/snippet}
	{#snippet content()}
		{#if !editing}
			<p>Click "Edit" above to enable controls.</p>
		{:else}
			<div class="flex flex-col gap-2">
				<div class="text-md text-center uppercase">Humanity</div>
				<div class="flex items-center justify-between gap-3">
					<button
						class="btn preset-tonal-surface"
						disabled={humanity <= 0}
						onclick={decHumanity}
						aria-label="Decrease Humanity"
					>
						-
					</button>
					Rating
					<button
						class="btn preset-tonal-surface"
						disabled={humanity >= 10}
						onclick={incHumanity}
						aria-label="Increase Humanity"
					>
						+
					</button>
				</div>
				<div class="flex items-center justify-between gap-3">
					<button
						class="btn preset-tonal-surface"
						disabled={stains <= 0}
						onclick={decStains}
						aria-label="Decrease Stains"
					>
						-
					</button>
					Stains
					<button
						class="btn preset-tonal-surface"
						disabled={stains >= 10}
						onclick={incStains}
						aria-label="Increase Stains"
					>
						+
					</button>
				</div>
			</div>
		{/if}
	{/snippet}
</Popover>
