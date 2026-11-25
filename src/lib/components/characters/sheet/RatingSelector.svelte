<script lang="ts">
	import Popover from '$lib/components/ui/Popover.svelte';
	import { CirclePlus, CircleX, ListPlus } from '@lucide/svelte';

	import { insensitiveSort, normalize, straightenApostrophes } from '../../..';
	import { getConstraints, maxCodeUnits, nameKey, traitNameError } from '$lib/constraints';
	import ErrorMessage from '$lib/components/ui/ErrorMessage.svelte';
	import { getPoolPicker } from '$lib/state/poolPicker.svelte';
	import PickableTrait from './PickableTrait.svelte';

	interface ComponentProps {
		name?: string;
		rating: number;
		subtraits?: string[];
		min?: number;
		max?: number;
		showLabel?: boolean;
		editing: boolean;
		allowsSubtraits: boolean;
		type?: string;
	}

	let {
		name = $bindable(''),
		rating = $bindable(),
		subtraits = $bindable([]),
		min = 0,
		max = 5,
		showLabel = true,
		editing,
		allowsSubtraits,
		type
	}: ComponentProps = $props();
	// Unique per instance: several of these can show an error at once
	const uid = $props.id();
	const subtraitErrorId = `${uid}-subtrait-error`;

	// Only read while editing specialties, so a read-only rating needs none provided
	const constraints = getConstraints();

	let showSubtraits = $state(false);
	let enablePopover = $derived((allowsSubtraits && editing) || subtraits.length > 0);
	let hoveredRating = $state<number | null>(null);

	const subtraitLabel = $derived(type === 'discipline' ? 'Power' : 'Specialty');
	const subtraitsLabel = $derived(type === 'discipline' ? 'Powers' : 'Specialties');

	let newSubtrait = $state('');
	let normalizedNewSubtrait = $derived(normalize(straightenApostrophes(newSubtrait)));

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
		return normalizedNewSubtrait.length > 0 && subtraitError === null;
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

	let subtraitError = $derived.by(() => {
		if (normalizedNewSubtrait.length === 0) return null;
		const error = traitNameError(normalizedNewSubtrait, constraints(), true);
		if (error) return error;
		// As the bot compares them: "BigCats" duplicates Big Cats
		const key = nameKey(normalizedNewSubtrait);
		const isDuplicate = subtraits.some((existing: string) => nameKey(existing) === key);
		if (isDuplicate) return `${subtraitLabel} already exists`;
		return null;
	});
	let invalidSubtrait = $derived(subtraitError !== null);

	const circles = $derived(Array.from({ length: max }, (_, i) => i + 1));

	// While a pool is being picked (on the character page), a named trait's line is a choice
	const picker = getPoolPicker();
	const pickable = $derived(picker?.active === true && !editing && showLabel && name !== '');
	// Rolled by the macro whose card is hovered
	const highlight = $derived(
		!editing && showLabel && name !== '' ? picker?.highlighted(name) : undefined
	);
</script>

{#snippet pips()}
	<span class="sr-only">{rating} dots</span>
	{#each circles as circleRating (circleRating)}
		<span class="rating-circle" class:selected={circleRating <= rating} aria-hidden="true"></span>
	{/each}
{/snippet}

{#snippet pickLine()}
	<span class="flex items-center gap-2">
		{name}
		{#if subtraits.length > 0}
			<span class="badge-icon preset-filled-surface-500">{subtraits.length}</span>
		{/if}
	</span>
	<span class="flex flex-wrap gap-2">{@render pips()}</span>
{/snippet}

{#if pickable && picker}
	<PickableTrait {picker} {name} {subtraits} {type} line={pickLine} />
{:else}
	<div
		class="trait-line flex flex-wrap items-center justify-between"
		data-highlight={highlight ? (highlight.negative ? 'subtracted' : 'added') : undefined}
	>
		{#if showLabel && name}
			{#if enablePopover}
				<Popover bind:open={showSubtraits} arrow>
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
							<span class="badge text-surface-100 -mt-4 text-base">{subtraitsLabel}</span>
							<hr class="text-surface-400 -mx-4 -mt-2" />
							{#if subtraits.length > 0}
								{#each subtraits as subtrait, i (subtrait)}
									{@const buttonTitle = `Remove ${subtrait}`}
									<div class="flex items-center gap-2">
										<span class="transition-all hover:brightness-125">{subtrait}</span>
										{#if editing}
											<button
												type="button"
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
								<div class="flex items-stretch gap-2">
									<input
										type="text"
										bind:value={newSubtrait}
										onkeydown={(e) => {
											if (e.key !== 'Enter') return;
											e.preventDefault(); // Enter adds the specialty, never submitting a form around it
											handleAddSubtrait();
										}}
										placeholder="Add new {subtraitLabel} ..."
										aria-label="New {subtraitLabel}"
										maxlength={maxCodeUnits(constraints().trait_max_length)}
										class="input border"
										class:text-error-500={invalidSubtrait}
										class:border-error-500={invalidSubtrait}
										aria-describedby={subtraitError ? subtraitErrorId : undefined}
									/>
									<button
										type="button"
										class="btn preset-filled-secondary-500"
										onclick={handleAddSubtrait}
										disabled={!isValidSubtrait()}
										aria-label="Add {subtraitLabel.toLowerCase()}"
									>
										<CirclePlus />
									</button>
								</div>
								<ErrorMessage error={subtraitError} id={subtraitErrorId} />
							{/if}
						</div>
					{/snippet}
				</Popover>
			{:else}
				{name}
			{/if}
		{/if}
		<div role="group" class="flex flex-wrap gap-2" onmouseleave={() => (hoveredRating = null)}>
			{#if editing}
				{#each circles as circleRating (circleRating)}
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
				{@render pips()}
			{/if}
		</div>
	</div>
{/if}

<style lang="postcss">
	.rating-circle {
		width: 1.45rem;
		height: 1.45rem;
		border-radius: 50%;
		/* An empty socket: a bone-colored ring, sunk into the panel */
		border: 2px solid color-mix(in oklab, var(--color-surface-200) 70%, transparent);
		background-color: oklch(0% 0 0 / 0.25);
		box-shadow: inset 0 1px 3px oklch(0% 0 0 / 0.6);
		padding: 0;
		transition: all 0.3s ease;
	}

	/* A bead of blood: lit from the upper left, darkening to the rim */
	.rating-circle.selected,
	.rating-circle.hovered {
		background: radial-gradient(
			circle at 35% 30%,
			oklch(72% 0.17 25deg) 0%,
			var(--blood-bright) 22%,
			var(--blood) 60%,
			var(--blood-dark) 100%
		);
		border-color: var(--blood-dark);
		box-shadow:
			0 0 6px color-mix(in oklab, var(--blood-bright) 40%, transparent),
			inset 0 -1px 2px oklch(0% 0 0 / 0.5);
	}

	.rating-circle.hovered {
		opacity: 0.5;
	}

	.rating-circle.editable:focus {
		outline: none;
	}

	.rating-circle.editable:focus-visible {
		outline: 2px solid var(--color-primary-300);
		outline-offset: 2px;
	}
</style>
