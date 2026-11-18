<script lang="ts">
	import { untrack } from 'svelte';

	import { BusySubmit } from '$lib/state/busySubmit.svelte';
	import { damage } from '$lib/api/characterActions';
	import { takeDamage } from '$lib/rules/damage';
	import type { Character, TrackType } from '$lib/types';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ModalActions from '$lib/components/ui/ModalActions.svelte';
	import BusySpinner from '$lib/components/ui/BusySpinner.svelte';
	import DamageTrack from './DamageTrack.svelte';
	import Stepper from '$lib/components/ui/Stepper.svelte';
	import AggravatedBox from '$lib/components/characters/glyphs/damage/Aggravated.svelte';
	import SuperficialBox from '$lib/components/characters/glyphs/damage/Superficial.svelte';

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

	const submit = new BusySubmit();

	// Each opening starts with no damage queued (the parent opens it by setting `open`)
	$effect(() => {
		if (open) {
			untrack(() => {
				superficial = 0;
				aggravated = 0;
				submit.reset();
			});
		}
	});

	/**
	 * Deal the queued damage, with a spinner in place of the modal's content for at least the busy
	 * delay. On success the modal closes, and the sheet updates through the live update the save
	 * triggers; on failure it shows its content again, saying why.
	 */
	const apply = async () => {
		if (superficial + aggravated === 0) return;
		if (await submit.run(() => damage(character._id, { track, superficial, aggravated }))) {
			open = false; // Still spinning, so the content doesn't flash back as it closes
		}
	};
</script>

<Modal bind:open title="Take {trackLabel} Damage" closeOnEscape={!submit.busy}>
	{#if submit.busy}
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

		{#if submit.error}
			<p class="text-error-500 text-sm" role="alert">{submit.error}</p>
		{/if}

		<ModalActions
			bind:open
			action="Apply"
			onaction={apply}
			disabled={superficial + aggravated === 0}
		/>
	{/if}
</Modal>
