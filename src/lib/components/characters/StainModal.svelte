<script lang="ts">
	import { untrack } from 'svelte';
	import { Dialog } from '@skeletonlabs/skeleton-svelte';
	import { TriangleAlert } from '@lucide/svelte';

	import { atLeast } from '$lib/busy';
	import { stain } from '$lib/characterActions';
	import type { Character } from '$lib/types';
	import ClientPortal from '$lib/components/ClientPortal.svelte';
	import BusySpinner from './BusySpinner.svelte';
	import Humanity from './sheets/components/Humanity.svelte';
	import Stepper from './Stepper.svelte';

	interface ComponentProps {
		open: boolean;
		character: Character;
	}

	let { open = $bindable(), character }: ComponentProps = $props();

	// The Stains added to. The save's own live update arrives behind the spinner, so the preview
	// never shows the same Stains twice.
	const stains = $derived(character.stains ?? 0);

	let amount = $state(1);
	let applying = $state(false);
	let error: string | null = $state(null);

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
				error = null;
				applying = false;
			});
		}
	});

	/**
	 * Add the Stains, with a spinner in place of the modal's content for at least the busy delay. On
	 * success the modal closes, and the live update refreshes the sheet.
	 */
	const apply = async () => {
		if (applying || amount < 1) return;
		applying = true;
		error = null;
		const outcome = await atLeast(stain(character._id, { amount }));
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
				<Dialog.Title class="h5 text-center">Apply Stains</Dialog.Title>

				{#if applying}
					<BusySpinner label="Applying Stains…" />
				{:else}
					<!-- The preview: Humanity with the new Stains. The label goes above the track, since
				     beside it, ten boxes don't fit the modal; centered as a block, the label at the
				     track's edge. -->
					<div class="flex justify-center">
						<div class="grid gap-1">
							<Humanity character={preview} editing={false} />
						</div>
					</div>

					<Stepper label="Stains" bind:value={amount} min={1} {max} />

					{#if degeneration > 0}
						<p class="preset-tonal-error flex gap-2 rounded-md p-3 text-sm" role="status">
							<TriangleAlert size={18} class="shrink-0" />
							<span>Degeneration: {degeneration} Aggravated Willpower damage.</span>
						</p>
					{/if}

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
							disabled={max === 0}
						>
							Apply
						</button>
					</div>
				{/if}
			</Dialog.Content>
		</Dialog.Positioner>
	</ClientPortal>
</Dialog>
