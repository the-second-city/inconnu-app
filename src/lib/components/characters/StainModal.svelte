<script lang="ts">
	import { untrack } from 'svelte';
	import { TriangleAlert } from '@lucide/svelte';

	import { BusySubmit } from '$lib/busySubmit.svelte';
	import { stain } from '$lib/characterActions';
	import type { Character } from '$lib/types';
	import Modal from '$lib/components/Modal.svelte';
	import ModalActions from '$lib/components/ModalActions.svelte';
	import BusySpinner from './BusySpinner.svelte';
	import HumanityBlock from './HumanityBlock.svelte';
	import Stepper from './Stepper.svelte';
	import Warning from './Warning.svelte';

	interface ComponentProps {
		open: boolean;
		character: Character;
	}

	let { open = $bindable(), character }: ComponentProps = $props();

	// The Stains added to. The save's own live update arrives behind the spinner, so the preview
	// never shows the same Stains twice.
	const stains = $derived(character.stains ?? 0);

	let amount = $state(1);
	const submit = new BusySubmit();

	// The bot caps Stains at 10
	const max = $derived(10 - stains);
	const after = $derived(Math.min(10, stains + amount));
	// Stains past the boxes Humanity leaves empty deal Aggravated Willpower damage (degeneration)
	const degeneration = $derived.by(() => {
		const unfilled = 10 - character.humanity;
		return Math.max(0, after - unfilled) - Math.max(0, stains - unfilled);
	});
	// The character as the Stains would leave it, for the preview
	const preview: Character = $derived.by(() => ({ ...character, stains: after }));

	// Each opening starts over (the parent opens it by setting `open`)
	$effect(() => {
		if (open) {
			untrack(() => {
				amount = 1;
				submit.reset();
			});
		}
	});

	/**
	 * Add the Stains, with a spinner in place of the modal's content for at least the busy delay. On
	 * success the modal closes, and the live update refreshes the sheet.
	 */
	const apply = async () => {
		if (amount < 1) return;
		if (await submit.run(() => stain(character._id, { amount }))) {
			open = false; // Still spinning, so the content doesn't flash back as it closes
		}
	};
</script>

<Modal bind:open title="Apply Stains" closeOnEscape={!submit.busy}>
	{#if submit.busy}
		<BusySpinner label="Applying Stains…" />
	{:else}
		<!-- The preview: Humanity with the new Stains -->
		<HumanityBlock character={preview} />

		<Stepper label="Stains" bind:value={amount} min={1} {max} />

		{#if degeneration > 0}
			<Warning icon={TriangleAlert} role="status">
				Degeneration: {degeneration} Aggravated Willpower damage.
			</Warning>
		{/if}

		{#if submit.error}
			<p class="text-error-500 text-sm" role="alert">{submit.error}</p>
		{/if}

		<ModalActions bind:open action="Apply" onaction={apply} disabled={max === 0} />
	{/if}
</Modal>
