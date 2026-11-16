<script lang="ts">
	import { untrack } from 'svelte';
	import { Dialog } from '@skeletonlabs/skeleton-svelte';
	import { TriangleAlert } from '@lucide/svelte';

	import { mend } from '$lib/characterActions';
	import type { Character, MendResult, TrackType } from '$lib/types';
	import ClientPortal from '$lib/components/ClientPortal.svelte';
	import CountdownRing from './CountdownRing.svelte';
	import HungerDrops from './HungerDrops.svelte';
	import TrackBox from './sheets/components/damage/TrackBox.svelte';

	interface ComponentProps {
		open: boolean;
		character: Character;
		type: 'superficial' | 'aggravated';
		track?: TrackType; // Health mends as /mend and /aggheal do; Willpower recovers as /awaken does
		stepDelay?: number; // ms each Rouse counts down, so mending takes a moment
	}

	let {
		open = $bindable(),
		character,
		type,
		track = 'health',
		stepDelay = 750
	}: ComponentProps = $props();

	const isWillpower = $derived(track === 'willpower');
	const trackLabel = $derived(isWillpower ? 'Willpower' : 'Health');
	// Willpower recovers what a night's rest gives: the higher of Resolve and Composure
	const willpowerRecovery = $derived(
		Math.max(
			0,
			...character.traits
				.filter((t) => ['resolve', 'composure'].includes(t.name.toLowerCase()))
				.map((t) => t.rating)
		)
	);

	const isVampire = $derived(character.splat === 'vampire' || character.splat === 'thin-blood');
	const isAggravated = $derived(type === 'aggravated');
	// Vampires Rouse to heal Health: once to mend, three times for Aggravated. Others, and Willpower,
	// take a single beat.
	const rouses = $derived(isVampire && !isWillpower ? (isAggravated ? 3 : 1) : 0);

	let mending = $state(false);
	let remaining = $state(0); // The countdown while mending
	let error: string | null = $state(null);
	let result: MendResult | null = $state(null);
	let trackBefore = $state('');
	let hungerBefore = $state(0);

	/** Back to the start, as when the modal opens. */
	const reset = () => {
		result = null;
		error = null;
	};

	// Each opening starts over (the parent opens it by setting `open`)
	$effect(() => {
		if (open) untrack(reset);
	});

	/**
	 * Heal: the modal counts down from the number of Rouses (a single beat for non-vampires) to 0
	 * while the request runs, then shows the result (or the start again, with the error).
	 */
	const doMend = async () => {
		if (mending) return;
		mending = true;
		error = null;
		trackBefore = character[track];
		hungerBefore = character.hunger ?? 0;
		remaining = Math.max(rouses, 1);
		const request = mend(character._id, { type, track });
		while (remaining > 0) {
			await new Promise((resolve) => setTimeout(resolve, stepDelay));
			remaining--;
		}
		const outcome = await request;
		mending = false;
		if (outcome.error !== undefined) error = outcome.error;
		else result = outcome.result;
	};

	/**
	 * A track's boxes as the sheet shows them (damage first; tracks are stored healthy first), with
	 * the ones the healing produced marked. Tracks are sorted, so comparing box by box would mark
	 * every box after a change; instead, each kind that grew (say, one more healthy box) marks that
	 * many of its boxes, starting from the damage side, where the healing happened.
	 */
	const boxes = (track: string, before = track): { value: string; changed: boolean }[] => {
		const count = (t: string, kind: string): number => [...t].filter((b) => b === kind).length;
		const gained: Record<string, number> = {};
		for (const kind of ['.', '/', 'x']) {
			gained[kind] = Math.max(0, count(track, kind) - count(before, kind));
		}
		return [...track].reverse().map((value) => {
			const changed = gained[value] > 0;
			if (changed) gained[value]--;
			return { value, changed };
		});
	};

	const actionLabel = $derived(
		isWillpower ? (isAggravated ? 'Heal' : 'Recover') : isAggravated ? 'Heal' : 'Mend'
	);
	const cost = $derived.by(() => {
		if (isWillpower) {
			return isAggravated
				? 'Heals one Aggravated Willpower damage.'
				: `Recovers ${willpowerRecovery} Superficial Willpower damage, as a night's rest does (the higher of Resolve and Composure).`;
		}
		if (!isVampire) return `${character.name} heals without Rousing.`;
		return isAggravated
			? 'Healing Aggravated damage costs three Rouse Checks.'
			: 'Mending Superficial damage costs a Rouse Check.';
	});
	const title = $derived.by(() => {
		if (isWillpower) {
			if (result) return 'Willpower Recovered';
			return isAggravated ? 'Heal Aggravated Willpower' : 'Recover Willpower';
		}
		if (result) return isAggravated ? 'Aggravated Damage Healed' : 'Damage Mended';
		return isAggravated ? 'Heal Aggravated Damage' : 'Mend Damage';
	});
</script>

<!-- The track, damage first as the sheet shows it; boxes the healing produced pulse -->
{#snippet damageTrack(boxString: string, before?: string)}
	<div class="grid gap-1">
		<span>{trackLabel}</span>
		<div class="flex flex-wrap gap-2">
			{#each boxes(boxString, before) as box, i (i)}
				{#if box.changed}
					<span class="motion-safe:animate-pulse" data-healed>
						<TrackBox value={box.value} />
					</span>
				{:else}
					<TrackBox value={box.value} />
				{/if}
			{/each}
		</div>
	</div>
{/snippet}

<Dialog
	{open}
	onOpenChange={(e) => (open = e.open)}
	closeOnInteractOutside={false}
	closeOnEscape={!mending}
>
	<ClientPortal>
		<Dialog.Backdrop class="bg-surface-950/70 fixed inset-0 z-50 backdrop-blur-sm" />
		<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<Dialog.Content
				class="card bg-surface-200-800 border-surface-400-600 w-full max-w-sm space-y-4 border p-6 shadow-2xl"
			>
				<Dialog.Title class="h5 text-center">
					{title}
				</Dialog.Title>

				{#if mending}
					<CountdownRing {remaining} {stepDelay} />
				{:else if result === null}
					<!-- Before healing -->
					{@render damageTrack(character[track])}
					<p class="text-sm">{cost}</p>

					{#if error}
						<p class="text-error-500 text-sm" role="alert">{error}</p>
					{/if}

					<div class="flex justify-end gap-2">
						<button type="button" class="btn preset-tonal-surface" onclick={() => (open = false)}>
							Cancel
						</button>
						<button type="button" class="btn preset-filled-primary-500" onclick={doMend}>
							{actionLabel}
						</button>
					</div>
				{:else}
					<!-- Result -->
					<div class="space-y-3" role="status">
						<!-- Willpower doesn't Rouse, so it leaves Hunger alone -->
						{#if isVampire && !isWillpower}
							<HungerDrops before={hungerBefore} after={result.hunger} />
						{/if}
						{@render damageTrack(result.track, trackBefore)}
						{#if result.frenzy}
							<p class="preset-tonal-error flex gap-2 rounded-md p-3 text-sm">
								<TriangleAlert size={18} class="shrink-0" />
								<span>A Rouse failed at Hunger 5: test for Hunger frenzy.</span>
							</p>
						{/if}
						{#if result.torpor}
							<p class="preset-tonal-error flex gap-2 rounded-md p-3 text-sm">
								<TriangleAlert size={18} class="shrink-0" />
								<span>Hunger would pass 5: {character.name} falls into torpor.</span>
							</p>
						{/if}
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
				{/if}
			</Dialog.Content>
		</Dialog.Positioner>
	</ClientPortal>
</Dialog>
