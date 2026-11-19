<script lang="ts">
	import type { Snippet } from 'svelte';

	/** How a pip looks: filled, or a preview of filling it (while hovering in edit mode). */
	export interface PipState {
		filled: boolean;
		preview: boolean;
	}

	interface ComponentProps {
		label: string; // Names the rating for screen readers, e.g. "Hunger"
		rating: number;
		min?: number;
		max: number;
		editing: boolean;
		pip: Snippet<[PipState]>;
		gap?: string; // Tailwind gap class between pips
	}

	let {
		label,
		rating = $bindable(),
		min = 0,
		max,
		editing,
		pip,
		gap = 'gap-1'
	}: ComponentProps = $props();

	let hovered = $state<number | null>(null);

	const pips = $derived(Array.from({ length: max }, (_, i) => i + 1));

	/** Set the rating from a clicked pip, as RatingSelector does: clicking the only filled pip
	 * empties it (when the minimum allows), and nothing goes below the minimum. */
	function select(value: number): void {
		if (value === 1 && rating === 1) rating = Math.max(min, 0);
		else rating = Math.max(min, value);
	}
</script>

{#if editing}
	<!-- The preview clears on leaving the group, not each pip, so it doesn't flicker in the gaps -->
	<div
		role="group"
		aria-label="{label}: {rating} of {max}"
		class="flex items-center {gap}"
		onmouseleave={() => (hovered = null)}
	>
		{#each pips as value (value)}
			<!-- The padding, cancelled by the margin, enlarges small pips' click area in place -->
			<button
				type="button"
				class="-m-0.5 flex cursor-pointer items-center justify-center rounded-full p-0.5"
				onclick={() => select(value)}
				onmouseenter={() => (hovered = value)}
				aria-label="Set {label} to {value}"
			>
				{@render pip({
					filled: value <= rating,
					preview: hovered !== null && value <= hovered && value > rating
				})}
			</button>
		{/each}
	</div>
{:else}
	<div role="img" aria-label="{label} {rating}" class="flex items-center {gap}">
		{#each pips as value (value)}
			{@render pip({ filled: value <= rating, preview: false })}
		{/each}
	</div>
{/if}
