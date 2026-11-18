<script lang="ts">
	import { untrack } from 'svelte';
	import { BoneFracture, Flame, Heart, IvBag, Skull } from '@lucide/svelte';

	import { bloodPotency } from '$lib/rules/vampire';
	import { BusySubmit } from '$lib/state/busySubmit.svelte';
	import { slake } from '$lib/api/characterActions';
	import { animalBloodNote, feedingCost, type FeedingCost } from '$lib/rules/feeding';
	import type { Character } from '$lib/types';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ModalActions from '$lib/components/ui/ModalActions.svelte';
	import BusySpinner from '$lib/components/ui/BusySpinner.svelte';
	import ChoiceRow from '$lib/components/ui/ChoiceRow.svelte';
	import HungerDrops from './HungerDrops.svelte';
	import HungerMeter from './HungerMeter.svelte';
	import Warning from '$lib/components/ui/Warning.svelte';

	interface ComponentProps {
		open: boolean;
		character: Character;
	}

	let { open = $bindable(), character }: ComponentProps = $props();

	// The Hunger slaked from. The slake's own live update arrives behind the spinner, so the
	// preview never shows the same slaking twice.
	const hunger = $derived(character.hunger ?? 0);

	// The slake's request, behind a spinner
	const submit = new BusySubmit();

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

	// What each cost looks like: its icon and badge (harmless is blue, harmful a warning, a drain the
	// theme's crimson), and what it means for the victim (the row's description)
	const COST_STYLES: Record<
		FeedingCost,
		{
			icon: typeof Heart;
			badge: 'secondary' | 'warning' | 'blood';
			tone: 'secondary' | 'warning' | 'primary';
			consequence: string;
		}
	> = {
		harmless: {
			icon: Heart,
			badge: 'secondary',
			tone: 'secondary',
			consequence: 'Harmless'
		},
		harmful: {
			icon: BoneFracture,
			badge: 'warning',
			tone: 'warning',
			consequence: 'Harms the victim'
		},
		drain: {
			icon: Skull,
			badge: 'blood',
			tone: 'primary',
			consequence: 'Kills the victim'
		}
	};

	// The amount whose row is hovered, previewed on the current Hunger
	let previewing: number | null = $state(null);

	// Slaking from Hunger 4 or more calls for a frenzy test (Difficulty 3). The bot says so too; when
	// it does, the modal stays open after slaking to say what to roll, with the Hunger slaked.
	const frenzyRisk = $derived(hunger >= 4);
	let frenzied: { before: number; after: number } | null = $state(null);

	// Each opening starts over (the parent opens it by setting `open`)
	$effect(() => {
		if (open) {
			untrack(() => {
				frenzied = null;
				previewing = null;
				submit.reset();
			});
		}
	});

	/**
	 * Slake an amount, with a spinner in place of the modal's content for at least the busy delay. On
	 * success the modal closes, and the live update refreshes the sheet; unless it calls for a
	 * frenzy test, which the modal then shows.
	 */
	const apply = async (amount: number) => {
		const before = hunger;
		const slaked = await submit.run(() => slake(character._id, { amount }));
		if (!slaked) return;
		if (slaked.result?.frenzy) {
			frenzied = { before, after: Math.max(0, before - amount) };
			submit.reset();
		} else {
			open = false; // Still spinning, so the content doesn't flash back as it closes
		}
	};
</script>

<Modal bind:open title={frenzied ? 'Hunger Slaked' : 'Slake Hunger'} closeOnEscape={!submit.busy}>
	{#if submit.busy}
		<BusySpinner label="Slaking…" />
	{:else if frenzied}
		<!-- Slaked, but from Hunger 4+: the Hunger slaked (the drops it took pulsing), and the
		     frenzy test it calls for -->
		<div class="space-y-3" role="status">
			<HungerDrops before={frenzied.before} after={frenzied.after} />
			<Warning icon={Flame}>
				Slaking from Hunger {frenzied.before}: test for Hunger frenzy (Difficulty 3).
			</Warning>
		</div>
		<ModalActions bind:open done />
	{:else}
		<!-- The Hunger there is now. Drops a hovered choice would slake turn hollow. -->
		<HungerMeter
			{hunger}
			to={hunger - (previewing ?? 0)}
			size={28}
			label="Current Hunger {hunger}"
			class="flex justify-center gap-2"
		/>

		<!-- One row per amount: an icon badge colored by what the drink costs the victim, what that
		     means, and the Hunger it leaves -->
		<!-- The preview clears only on leaving the list, not each row, so moving between rows doesn't
		     flicker back to the current Hunger in the gaps -->
		<div
			class="flex flex-col gap-2"
			role="group"
			aria-label="Amounts to slake"
			onpointerleave={() => (previewing = null)}
		>
			{#each choices as choice (choice.amount)}
				{@const style = COST_STYLES[choice.cost]}
				<!-- The Hunger left trails, as a meter, so the rows line up -->
				<ChoiceRow
					icon={style.icon}
					label={choice.cost === 'drain' ? 'Drain' : `Slake ${choice.amount}`}
					name="Slake {choice.amount}: Hunger {choice.left} left"
					detail={style.consequence}
					badge={style.badge}
					tone={style.tone}
					outline={choice.cost === 'drain' ? 'primary' : 'surface'}
					onclick={() => apply(choice.amount)}
					onpointerenter={() => (previewing = choice.amount)}
				>
					{#snippet trailing()}<HungerMeter hunger={choice.left} />{/snippet}
				</ChoiceRow>
			{/each}
		</div>

		{#if frenzyRisk}
			<p class="text-warning-600-400 flex items-center justify-center gap-1.5 text-xs">
				<Flame size={14} class="shrink-0" />
				At Hunger {hunger}, slaking calls for a frenzy test (Difficulty 3).
			</p>
		{/if}

		{#if submit.error}
			<p class="text-error-500 text-sm" role="alert">{submit.error}</p>
		{/if}

		{#if animalNote}
			<p class="text-surface-200 flex items-center justify-center gap-1.5 text-xs">
				<IvBag size={14} class="shrink-0" />
				{animalNote}
			</p>
		{/if}

		<ModalActions bind:open />
	{/if}
</Modal>
