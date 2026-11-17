<script lang="ts">
	import { untrack } from 'svelte';
	import { Dialog } from '@skeletonlabs/skeleton-svelte';

	import { atLeast } from '$lib/busy';
	import { damage } from '$lib/characterActions';
	import { takeDamage } from '$lib/damage';
	import type { Character, TrackType } from '$lib/types';
	import ClientPortal from '$lib/components/ClientPortal.svelte';
	import BusySpinner from './BusySpinner.svelte';
	import DamageTrack from './DamageTrack.svelte';
	import Stepper from './Stepper.svelte';
	import AggravatedBox from './sheets/components/damage/Aggravated.svelte';
	import SuperficialBox from './sheets/components/damage/Superficial.svelte';

	interface ComponentProps {
		open: boolean;
		character: Character;
		track: TrackType;
	}

	let { open = $bindable(), character, track }: ComponentProps = $props();

	const trackLabel = $derived(track === 'willpower' ? 'Willpower' : 'Health');
	// The track the damage applies to. It follows the character (say, damage taken in Discord
	// meanwhile); the save's own live update arrives behind the spinner, so the preview never shows
	// the same damage twice.
	const current = $derived(character[track]);

	// The damage to take
	let superficial = $state(0);
	let aggravated = $state(0);

	// The track as the bot will leave it, so the preview matches
	const preview = $derived(takeDamage(current, superficial, aggravated));
	// More damage until every box is Aggravated: Superficial keeps wrapping past the track's length.
	// (Not "while one more would change the track": with Aggravated queued, the Superficial point
	// that fills the last healthy box changes nothing, since the Aggravated then replaces a
	// Superficial box instead, but the next Superficial point does.)
	const full = $derived(![...preview].some((box) => box !== 'x'));

	let applying = $state(false);
	let error: string | null = $state(null);

	// Each opening starts with no damage queued (the parent opens it by setting `open`)
	$effect(() => {
		if (open) {
			untrack(() => {
				superficial = 0;
				aggravated = 0;
				error = null;
				applying = false;
			});
		}
	});

	/**
	 * Deal the queued damage, with a spinner in place of the modal's content for at least the busy
	 * delay. On success the modal closes, and the sheet updates through the live update the save
	 * triggers; on failure it shows its content again, saying why.
	 */
	const apply = async () => {
		if (applying || superficial + aggravated === 0) return;
		applying = true;
		error = null;
		const outcome = await atLeast(damage(character._id, { track, superficial, aggravated }));
		if (outcome.error !== undefined) {
			applying = false;
			error = outcome.error;
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
				<Dialog.Title class="h5 text-center">Take {trackLabel} Damage</Dialog.Title>

				{#if applying}
					<BusySpinner label="Applying damage…" />
				{:else}
					<!-- The preview: the track as it would be, with the new damage pulsing -->
					<DamageTrack label={trackLabel} track={preview} before={current} markFrom="healthy" />

					<!-- Each amount with the box it adds, as the track draws it -->
					<Stepper label="Superficial" bind:value={superficial} canAdd={!full}>
						{#snippet icon()}<SuperficialBox size={20} />{/snippet}
					</Stepper>
					<Stepper label="Aggravated" bind:value={aggravated} canAdd={!full}>
						{#snippet icon()}<AggravatedBox size={20} />{/snippet}
					</Stepper>

					{#if error}
						<p class="text-error-500 text-sm" role="alert">{error}</p>
					{/if}

					<div class="flex justify-end gap-2">
						<button type="button" class="btn preset-tonal-surface" onclick={() => (open = false)}>
							Cancel
						</button>
						<button
							type="button"
							class="btn preset-filled-primary-500"
							onclick={apply}
							disabled={superficial + aggravated === 0}
						>
							Apply
						</button>
					</div>
				{/if}
			</Dialog.Content>
		</Dialog.Positioner>
	</ClientPortal>
</Dialog>
