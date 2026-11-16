<script lang="ts">
	import { untrack } from 'svelte';
	import { Dialog } from '@skeletonlabs/skeleton-svelte';
	import { BoneFracture, Heart, Loader2, Skull } from '@lucide/svelte';

	import { slake } from '$lib/characterActions';
	import { animalBloodNote, feedingCost, type FeedingCost } from '$lib/feeding';
	import type { Character } from '$lib/types';
	import ClientPortal from '$lib/components/ClientPortal.svelte';
	import EmptyHunger from './sheets/components/hunger/Empty.svelte';
	import FilledHunger from './sheets/components/hunger/Filled.svelte';

	interface ComponentProps {
		open: boolean;
		character: Character;
	}

	let { open = $bindable(), character }: ComponentProps = $props();

	// The Hunger slaked from. Applying freezes it: the save's live update brings the new Hunger while
	// the modal closes, and previewing the same slaking on that would show it twice.
	let frozen: number | null = $state(null);
	const hunger = $derived(frozen ?? character.hunger ?? 0);

	// The amount being slaked, while its request runs
	let applying: number | null = $state(null);

	// One choice per amount there is to slake, each with what it costs one human victim (as the game
	// assumes), by Blood Potency. A drain always takes Hunger to 0, so amounts that would need one
	// short of that are left out, leaving one drain: the slake to 0.
	const potency = $derived(character.potency ?? character.blood_potency ?? 0);
	const choices = $derived(
		Array.from({ length: Math.min(5, hunger) }, (_, i) => {
			const amount = i + 1;
			return { amount, left: hunger - amount, cost: feedingCost(potency, hunger, amount) };
		}).filter((choice) => choice.cost !== 'drain' || choice.left === 0)
	);
	const animalNote = $derived(animalBloodNote(potency));

	// What each cost looks like: its icon badge's colors (harmless is blue, harmful a warning, a drain
	// the theme's crimson), and what it means for the victim
	const COST_STYLES: Record<FeedingCost, { badge: string; text: string; consequence: string }> = {
		harmless: {
			badge: 'preset-tonal-secondary',
			text: 'text-secondary-600-400',
			consequence: 'Harmless'
		},
		harmful: {
			badge: 'preset-tonal-warning',
			text: 'text-warning-600-400',
			consequence: 'Harms the victim'
		},
		drain: {
			badge: 'preset-filled-primary-500',
			text: 'text-primary-600-400',
			consequence: 'Kills the victim'
		}
	};

	// The amount whose row is hovered, previewed on the current Hunger
	let previewing: number | null = $state(null);
	const COST_LABELS: Record<FeedingCost, string> = {
		harmless: 'harmless',
		harmful: 'harmful drink',
		drain: 'full drain, the victim dies'
	};
	let error: string | null = $state(null);

	// Each opening starts over (the parent opens it by setting `open`)
	$effect(() => {
		if (open) {
			untrack(() => {
				error = null;
				frozen = null;
				previewing = null;
			});
		}
	});

	/** Slake an amount. On success the modal closes, and the live update refreshes the sheet. */
	const apply = async (amount: number) => {
		if (applying !== null) return;
		applying = amount;
		error = null;
		frozen = character.hunger ?? 0;
		const outcome = await slake(character._id, { amount });
		applying = null;
		if (outcome.error !== undefined) {
			error = outcome.error;
			frozen = null; // Nothing was saved, so follow the character again
		} else {
			open = false;
		}
	};
</script>

<Dialog
	{open}
	onOpenChange={(e) => (open = e.open)}
	closeOnInteractOutside={false}
	closeOnEscape={applying === null}
>
	<ClientPortal>
		<Dialog.Backdrop class="bg-surface-950/70 fixed inset-0 z-50 backdrop-blur-sm" />
		<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<Dialog.Content
				class="card bg-surface-200-800 border-surface-400-600 w-full max-w-sm space-y-4 border p-6 shadow-2xl"
			>
				<Dialog.Title class="h5 text-center">Slake Hunger</Dialog.Title>

				<!-- The Hunger there is now -->
				<div class="flex justify-center gap-2" role="img" aria-label="Current Hunger {hunger}">
					{#each Array(5), i (i)}
						<!-- Drops a hovered choice would slake turn hollow -->
						{#if i < hunger - (previewing ?? 0)}
							<FilledHunger size={28} />
						{:else}
							<EmptyHunger size={28} />
						{/if}
					{/each}
				</div>

				<!-- One row per amount: an icon badge colored by what the drink costs the victim, what
				     that means, and the Hunger it leaves -->
				<!-- The preview clears only on leaving the list, not each row, so moving between rows
				     doesn't flicker back to the current Hunger in the gaps -->
				<div
					class="flex flex-col gap-2"
					role="group"
					aria-label="Amounts to slake"
					onpointerleave={() => (previewing = null)}
				>
					{#each choices as choice (choice.amount)}
						{@const style = COST_STYLES[choice.cost]}
						<button
							type="button"
							class={[
								'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
								'hover:bg-surface-300-700/40 disabled:opacity-50',
								choice.cost === 'drain' ? 'border-primary-500' : 'border-surface-600-400'
							]}
							onclick={() => apply(choice.amount)}
							onpointerenter={() => (previewing = choice.amount)}
							disabled={applying !== null}
							aria-busy={applying === choice.amount}
							aria-label="Slake {choice.amount}: {COST_LABELS[
								choice.cost
							]}, Hunger {choice.left} left"
						>
							<span
								class="flex size-9 shrink-0 items-center justify-center rounded-full {style.badge}"
							>
								{#if applying === choice.amount}
									<Loader2 size={18} class="animate-spin" />
								{:else if choice.cost === 'drain'}
									<Skull size={18} />
								{:else if choice.cost === 'harmful'}
									<BoneFracture size={18} />
								{:else}
									<Heart size={18} />
								{/if}
							</span>
							<span class="flex grow flex-col leading-tight">
								<span class="font-semibold">
									{choice.cost === 'drain' ? 'Drain' : `Slake ${choice.amount}`}
								</span>
								<span class="text-sm {style.text}">{style.consequence}</span>
							</span>
							<!-- The Hunger left, as a meter, so the rows line up -->
							<span class="flex shrink-0 gap-0.5" aria-hidden="true">
								{#each Array(5), i (i)}
									{#if i < choice.left}
										<FilledHunger size={14} />
									{:else}
										<EmptyHunger size={14} />
									{/if}
								{/each}
							</span>
						</button>
					{/each}
				</div>

				{#if error}
					<p class="text-error-500 text-sm" role="alert">{error}</p>
				{/if}

				{#if animalNote}
					<p class="text-surface-200 text-center text-xs">{animalNote}</p>
				{/if}

				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="btn preset-tonal-surface"
						onclick={() => (open = false)}
						disabled={applying !== null}
					>
						Cancel
					</button>
				</div>
			</Dialog.Content>
		</Dialog.Positioner>
	</ClientPortal>
</Dialog>
