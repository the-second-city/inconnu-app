<script lang="ts">
	import { Popover } from '@skeletonlabs/skeleton-svelte';
	import { CirclePlus, CircleX, ListPlus } from '@lucide/svelte';

	import { insensitiveSort, isValidTraitName, normalize } from '$lib';

	interface ComponentProps {
		name?: string;
		rating: number;
		subtraits?: string[];
		min?: number;
		max?: number;
		showLabel?: boolean;
		editing: boolean;
		allowsSubtraits: boolean;
	}

	let {
		name = $bindable(''),
		rating = $bindable(),
		subtraits = $bindable([]),
		min = 0,
		max = 5,
		showLabel = true,
		editing,
		allowsSubtraits
	}: ComponentProps = $props();

	let showSubtraits = $state(false);
	let enablePopover = $derived((allowsSubtraits && editing) || subtraits.length > 0);
	let hoveredRating = $state<number | null>(null);

	let newSubtrait = $state('');
	let normalizedNewSubtrait = $derived(normalize(newSubtrait));

	function handleRatingChange(newRating: number): void {
		if (!editing) return;

		if (newRating <= min) {
			rating = min;
		} else if (newRating === 1 && rating === 1) {
			// Allow 0 to be selected if min === 0
			rating = 0;
		} else {
			rating = newRating;
		}
	}

	function isValidSubtrait(): boolean {
		const isDuplicate = subtraits.some(
			(existing: string) => existing.toLowerCase() === normalizedNewSubtrait.toLowerCase()
		);
		return !isDuplicate && isValidTraitName(normalizedNewSubtrait);
	}

	function handleAddSubtrait() {
		if (isValidSubtrait()) {
			let newSubtraits = [...subtraits, normalizedNewSubtrait];
			insensitiveSort(newSubtraits);

			subtraits = [...newSubtraits];
			newSubtrait = '';
		}
	}

	function handleRemoveSubtrait(index: number) {
		subtraits.splice(index, 1);
	}

	let invalidSubtrait = $derived(normalizedNewSubtrait.length > 0 && !isValidSubtrait());

	const circles = $derived(Array.from({ length: max }, (_, i) => i + 1));
</script>

<div class="flex flex-wrap items-center justify-between">
	{#if showLabel && name}
		{#if enablePopover}
			<Popover
				open={showSubtraits}
				onOpenChange={(e) => (showSubtraits = e.open)}
				contentBase="card bg-surface-500 p-4"
				arrow
				arrowBackground="!bg-surface-500 dark:!bg-surface-500"
			>
				{#snippet trigger()}
					<div class="flex items-center gap-2 text-left">
						{name}
						{#if subtraits.length > 0}
							<span class="badge-icon preset-filled-surface-500">
								{subtraits.length}
							</span>
						{:else}
							<ListPlus size={14} />
						{/if}
					</div>
				{/snippet}
				{#snippet content()}
					<div class="flex flex-col gap-2">
						<span class="badge text-base">Specialties</span>
						{#if subtraits.length > 0}
							{#each subtraits as subtrait, i}
								{@const buttonTitle = `Remove ${subtrait}`}
								<div class="flex items-center gap-2">
									<span class="transition-all hover:brightness-125">{subtrait}</span>
									{#if editing}
										<button
											onclick={() => handleRemoveSubtrait(i)}
											aria-label={buttonTitle}
											title={buttonTitle}
											tabindex="0"
										>
											<span class="sr-only">Remove {subtrait}</span>
											<CircleX size={14} color="#FF0000" />
										</button>
									{/if}
								</div>
							{/each}
						{/if}
						{#if editing}
							<div class="flex items-center gap-2">
								<input
									type="text"
									bind:value={newSubtrait}
									onkeydown={(e) => e.key === 'Enter' && handleAddSubtrait()}
									placeholder="Add new specialty ..."
									class="input border"
									class:text-error-500={invalidSubtrait}
									class:border-error-500={invalidSubtrait}
								/>
								<button
									class="btn preset-filled-secondary-500"
									onclick={handleAddSubtrait}
									disabled={!isValidSubtrait()}
									aria-label="Add spcialty"
								>
									<CirclePlus />
								</button>
							</div>
						{/if}
					</div>
				{/snippet}
			</Popover>
		{:else}
			{name}
		{/if}
	{/if}
	<div class="flex flex-wrap gap-2" onmouseleave={() => (hoveredRating = null)}>
		{#if editing}
			{#each circles as circleRating}
				<button
					type="button"
					class="rating-circle"
					class:selected={circleRating <= rating}
					class:editable={editing}
					class:hovered={hoveredRating !== null &&
						circleRating <= hoveredRating &&
						circleRating > rating}
					onclick={() => handleRatingChange(circleRating)}
					onmouseenter={() => (hoveredRating = circleRating)}
					aria-label="{name}: {circleRating} dots"
				></button>
			{/each}
		{:else}
			<span class="sr-only">{rating} dots</span>
			{#each circles as circleRating}
				<span class="rating-circle" class:selected={circleRating <= rating} aria-hidden="true"
				></span>
			{/each}
		{/if}
	</div>
</div>

<style lang="postcss">
	.rating-circle {
		width: 1.45rem;
		height: 1.45rem;
		border-radius: 50%;
		border: 2px solid #ccc;
		background-color: transparent;
		padding: 0;
		transition: all 0.3s ease;
	}

	.rating-circle.selected {
		background-color: #ff0000;
		background-color: var(--color-secondary-500) !important;
		border-color: var(--color-secondary-500) !important;
	}

	.rating-circle.hovered {
		background-color: var(--color-secondary-500) !important;
		border-color: var(--color-secondary-500) !important;
		opacity: 0.5;
	}

	.rating-circle.editable:focus {
		outline: none;
		box-shadow: 0 0 0 2px rgba(var(--color-secondary-500), 0.3) !important;
	}
</style>
