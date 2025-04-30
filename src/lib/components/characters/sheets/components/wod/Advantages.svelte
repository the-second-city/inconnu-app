<script lang="ts">
	import { Popover } from '@skeletonlabs/skeleton-svelte';
	import { CirclePlus, CircleX } from '@lucide/svelte';

	import type { Advantage, AdvantageType } from '$lib/types';

	import Card from '$lib/components/Card.svelte';

	import { isValidTraitName, normalize } from '$lib';

	interface ComponentProps {
		advantages: Advantage[];
		editing: boolean;
	}
	let { advantages = $bindable(), editing }: ComponentProps = $props();

	function filterAdvantages(type: AdvantageType): number[] {
		return advantages
			.map((advantage, index) => ({ advantage, index }))
			.filter((item) => item.advantage.type === type)
			.map((item) => item.index);
	}
	let indicesMerits = $derived(filterAdvantages('merit'));
	let indicesFlaws = $derived(filterAdvantages('flaw'));

	let showMeritsPopover = $state(false);
	let showFlawsPopover = $state(false);

	let newAdvantageName = $state('');
	let newAdvantageRating = $state(1);

	let normalizedAdvantage = $derived(normalize(newAdvantageName));
	let invalidAdvantage = $derived.by(() => {
		if (newAdvantageRating <= 0) return true;
		if (normalizedAdvantage.length === 0) return true;
		if (!isValidTraitName(normalizedAdvantage)) return true;

		const lowercased = normalizedAdvantage.toLowerCase();
		const isDuplicate = advantages.some((advantage) => advantage.name.toLowerCase() === lowercased);
		return isDuplicate;
	});

	function handleAddAdvantage(type: AdvantageType) {
		if (invalidAdvantage) return;

		const newAdvantage = {
			name: normalizedAdvantage,
			type: type,
			rating: Math.abs(newAdvantageRating)
		};
		advantages.push(newAdvantage);
		advantages.sort((a, b) => {
			const nameComparison = a.name.localeCompare(b.name);
			if (nameComparison !== 0) return nameComparison;

			// If names are equal, sort by rating (descending)
			return b.rating - a.rating;
		});

		showMeritsPopover = false;
		showFlawsPopover = false;
	}

	function handleRemoveAdvantage(index: number) {
		advantages.splice(index, 1);
	}
</script>

{#snippet group(
	type: AdvantageType,
	title: string,
	indices: number[],
	italic: boolean,
	isOpen: boolean,
	onOpenChange: (open: boolean) => void
)}
	<div>
		<div class="mb-2 flex items-center justify-between">
			<h3 class="h3 -mt-1 text-xl font-semibold uppercase">
				{title}
			</h3>
			{#if editing}
				<Popover
					open={isOpen}
					onOpenChange={(e) => onOpenChange(e.open)}
					contentBase="card bg-surface-500 p-4"
					arrow
					arrowBackground="!bg-surface-500 dark:!bg-surface-500"
				>
					{#snippet trigger()}
						<CirclePlus />
					{/snippet}
					{#snippet content()}
						<div class="flex flex-col gap-2">
							<span class="badge">Add {type}</span>
							<form class="flex flex-col gap-2" autocomplete="off">
								<label class="label">
									<span>Name</span>
									<input
										type="text"
										placeholder="Enter {type} name"
										bind:value={newAdvantageName}
										class="input border"
										class:text-error-500={invalidAdvantage}
										class:border-error-500={invalidAdvantage}
										autocomplete="off"
										name="advantage-field"
										data-1p-ignore
									/>
								</label>

								<label class="label">
									<span>Rating</span>
									<select
										class="select border"
										autocomplete="off"
										bind:value={newAdvantageRating}
										data-1p-ignore
									>
										{#each Array.from({ length: 7 }, (_, i) => i + 1) as rating}
											<option value={rating}>{rating}</option>
										{/each}
									</select>
								</label>

								<div class="mt-2 flex justify-end">
									<button
										type="submit"
										disabled={invalidAdvantage}
										class="btn preset-filled-secondary-500 hover:brightness-125"
										onclick={() => handleAddAdvantage(type)}
										aria-label="Add new Advantage"
									>
										Add
									</button>
								</div>
							</form>
						</div>
					{/snippet}
				</Popover>
			{/if}
		</div>
		<div class="flex flex-col">
			{#if indices.length > 0}
				{#each indices as index (advantages[index].name)}
					{@const buttonTitle = `Remove ${advantages[index]}`}
					<div class="flex items-center justify-between" class:italic>
						<div class="flex items-center gap-2">
							{#if editing}
								<button
									onclick={() => handleRemoveAdvantage(index)}
									aria-label={buttonTitle}
									title={buttonTitle}
									tabindex="0"
								>
									<span class="sr-only">Remove {advantages[index]}</span>
									<CircleX size={14} color="#FF0000" />
								</button>
							{/if}
							{advantages[index].name}
						</div>
						<span>{advantages[index].rating}</span>
					</div>
					<br />
				{/each}
			{:else}
				<p class="text-surface-800-200 italic">Add {title} in edit mode.</p>
			{/if}
		</div>
	</div>
{/snippet}

<Card>
	<div class="flex flex-col gap-4">
		{@render group(
			'merit',
			'Merits',
			indicesMerits,
			false,
			showMeritsPopover,
			(open: boolean) => (showMeritsPopover = open)
		)}
		{@render group(
			'flaw',
			'Flaws',
			indicesFlaws,
			true,
			showFlawsPopover,
			(open: boolean) => (showFlawsPopover = open)
		)}
	</div>
</Card>
