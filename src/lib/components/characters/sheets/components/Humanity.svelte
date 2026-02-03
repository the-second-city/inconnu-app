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

	let boxStates = $derived.by(() => {
		const humanity = character.humanity || 7;
		const stains = character.stains || 0;

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
		if ((character.humanity || 7) < 10) {
			character.humanity = (character.humanity || 7) + 1;
		}
	}

	function decHumanity() {
		if ((character.humanity || 7) > 0) {
			character.humanity = (character.humanity || 7) - 1;
		}
	}

	function incStains() {
		if ((character.stains || 0) < 10) {
			character.stains = (character.stains || 0) + 1;
		}
	}

	function decStains() {
		if ((character.stains || 0) > 0) {
			character.stains = (character.stains || 0) - 1;
		}
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
			{#each Array(boxStates.filled) as _}
				<Filled size={20} />
			{/each}
			{#each Array(boxStates.empty) as _}
				<Empty size={20} />
			{/each}
			{#each Array(boxStates.degeneration) as _}
				<Degeneration size={20} />
			{/each}
			{#each Array(boxStates.stains) as _}
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
						disabled={(character.humanity || 7) <= 0}
						onclick={decHumanity}
					>
						-
					</button>
					Rating
					<button
						class="btn preset-tonal-surface"
						disabled={(character.humanity || 7) >= 10}
						onclick={incHumanity}
					>
						+
					</button>
				</div>
				<div class="flex items-center justify-between gap-3">
					<button
						class="btn preset-tonal-surface"
						disabled={(character.stains || 0) <= 0}
						onclick={decStains}
					>
						-
					</button>
					Stains
					<button
						class="btn preset-tonal-surface"
						disabled={(character.stains || 0) >= 10}
						onclick={incStains}
					>
						+
					</button>
				</div>
			</div>
		{/if}
	{/snippet}
</Popover>
