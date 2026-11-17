<script lang="ts">
	import { untrack } from 'svelte';
	import { Dialog } from '@skeletonlabs/skeleton-svelte';
	import { BoneFracture, Flame, Heart, IvBag, Skull } from '@lucide/svelte';

	import { bloodPotency } from '$lib/vampire';
	import { atLeast } from '$lib/busy';
	import { slake } from '$lib/characterActions';
	import { animalBloodNote, feedingCost, type FeedingCost } from '$lib/feeding';
	import type { Character } from '$lib/types';
	import ClientPortal from '$lib/components/ClientPortal.svelte';
	import BusySpinner from './BusySpinner.svelte';
	import HungerDrops from './HungerDrops.svelte';
	import EmptyHunger from './sheets/components/hunger/Empty.svelte';
	import FilledHunger from './sheets/components/hunger/Filled.svelte';

	interface ComponentProps {
		open: boolean;
		character: Character;
	}

	let { open = $bindable(), character }: ComponentProps = $props();

	// The Hunger slaked from. The slake's own live update arrives behind the spinner, so the
	// preview never shows the same slaking twice.
	const hunger = $derived(character.hunger ?? 0);

	// Whether a slake's request is running
	let applying = $state(false);

	// One choice per amount there is to slake, each with what it costs one human victim (as the game
	// assumes), by Blood Potency. A drain always takes Hunger to 0, so amounts that would need one
	// short of that are left out, leaving one drain: the slake to 0.
	const potency = $derived(bloodPotency(character));
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

	// Slaking from Hunger 4 or more calls for a frenzy test (Difficulty 3). The bot says so too; when
	// it does, the modal stays open after slaking to say what to roll, with the Hunger slaked.
	const frenzyRisk = $derived(hunger >= 4);
	let frenzied: { before: number; after: number } | null = $state(null);

	// Each opening starts over (the parent opens it by setting `open`)
	$effect(() => {
		if (open) {
			untrack(() => {
				frenzied = null;
				error = null;
				previewing = null;
				applying = false;
			});
		}
	});

	/**
	 * Slake an amount, with a spinner in place of the modal's content for at least the busy delay. On
	 * success the modal closes, and the live update refreshes the sheet; unless it calls for a
	 * frenzy test, which the modal then shows.
	 */
	const apply = async (amount: number) => {
		if (applying) return;
		applying = true;
		error = null;
		const before = hunger;
		const outcome = await atLeast(slake(character._id, { amount }));
		if (outcome.error !== undefined) {
			applying = false;
			error = outcome.error;
		} else if (outcome.result?.frenzy) {
			frenzied = { before, after: Math.max(0, before - amount) };
			applying = false;
		} else {
			open = false; // Still spinning, so the content doesn't flash back as it closes
		}
	};
</script>

<Dialog
	{open}
	onOpenChange={(e) => (open = e.open)}
	closeOnInteractOutside={false}
	closeOnEscape={!applying}
>
	<ClientPortal>
		<Dialog.Backdrop class="bg-surface-950/70 fixed inset-0 z-50 backdrop-blur-sm" />
		<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<Dialog.Content
				class="card bg-surface-200-800 border-surface-400-600 w-full max-w-sm space-y-4 border p-6 shadow-2xl"
			>
				<Dialog.Title class="h5 text-center">
					{frenzied ? 'Hunger Slaked' : 'Slake Hunger'}
				</Dialog.Title>

				{#if applying}
					<BusySpinner label="Slaking…" />
				{:else if frenzied}
					<!-- Slaked, but from Hunger 4+: the Hunger slaked (the drops it took pulsing), and the
					     frenzy test it calls for -->
					<div class="space-y-3" role="status">
						<HungerDrops before={frenzied.before} after={frenzied.after} />
						<p class="preset-tonal-error flex gap-2 rounded-md p-3 text-sm">
							<Flame size={18} class="shrink-0" />
							<span
								>Slaking from Hunger {frenzied.before}: test for Hunger frenzy (Difficulty 3).</span
							>
						</p>
					</div>
					<div class="flex justify-end">
						<button
							type="button"
							class="btn preset-filled-primary-500"
							onclick={() => (open = false)}
						>
							Done
						</button>
					</div>
				{:else}
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
									'hover:bg-surface-300-700/40',
									choice.cost === 'drain' ? 'border-primary-500' : 'border-surface-600-400'
								]}
								onclick={() => apply(choice.amount)}
								onpointerenter={() => (previewing = choice.amount)}
								aria-label="Slake {choice.amount}: {COST_LABELS[
									choice.cost
								]}, Hunger {choice.left} left"
							>
								<span
									class="flex size-9 shrink-0 items-center justify-center rounded-full {style.badge}"
								>
									{#if choice.cost === 'drain'}
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

					{#if frenzyRisk}
						<p class="text-warning-600-400 flex items-center justify-center gap-1.5 text-xs">
							<Flame size={14} class="shrink-0" />
							At Hunger {hunger}, slaking calls for a frenzy test (Difficulty 3).
						</p>
					{/if}

					{#if error}
						<p class="text-error-500 text-sm" role="alert">{error}</p>
					{/if}

					{#if animalNote}
						<p class="text-surface-200 flex items-center justify-center gap-1.5 text-xs">
							<IvBag size={14} class="shrink-0" />
							{animalNote}
						</p>
					{/if}

					<div class="flex justify-end gap-2">
						<button type="button" class="btn preset-tonal-surface" onclick={() => (open = false)}>
							Cancel
						</button>
					</div>
				{/if}
			</Dialog.Content>
		</Dialog.Positioner>
	</ClientPortal>
</Dialog>
