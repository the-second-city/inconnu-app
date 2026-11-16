<script lang="ts">
	import { untrack } from 'svelte';
	import { Dialog } from '@skeletonlabs/skeleton-svelte';
	import { Loader2, TriangleAlert } from '@lucide/svelte';

	import { stain } from '$lib/characterActions';
	import type { Character } from '$lib/types';
	import ClientPortal from '$lib/components/ClientPortal.svelte';
	import Humanity from './sheets/components/Humanity.svelte';
	import Stepper from './Stepper.svelte';

	interface ComponentProps {
		open: boolean;
		character: Character;
	}

	let { open = $bindable(), character }: ComponentProps = $props();

	// The Stains added to. Applying freezes them: the save's live update brings the new Stains while
	// the modal closes, and previewing the same Stains on those would show them twice.
	let frozen: number | null = $state(null);
	const stains = $derived(frozen ?? character.stains ?? 0);

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
				frozen = null;
			});
		}
	});

	/** Add the Stains. On success the modal closes, and the live update refreshes the sheet. */
	const apply = async () => {
		if (applying || amount < 1) return;
		applying = true;
		error = null;
		frozen = character.stains ?? 0;
		const outcome = await stain(character._id, { amount });
		applying = false;
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
	closeOnEscape={!applying}
>
	<ClientPortal>
		<Dialog.Backdrop class="bg-surface-950/70 fixed inset-0 z-50 backdrop-blur-sm" />
		<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<Dialog.Content
				class="card bg-surface-200-800 border-surface-400-600 w-full max-w-sm space-y-4 border p-6 shadow-2xl"
			>
				<Dialog.Title class="h5 text-center">Apply Stains</Dialog.Title>

				<!-- The preview: Humanity with the new Stains. The label goes above the track, since
				     beside it, ten boxes don't fit the modal. -->
				<div class="grid gap-1">
					<Humanity character={preview} editing={false} />
				</div>

				<Stepper label="Stains" bind:value={amount} min={1} {max} disabled={applying} />

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
					<button
						type="button"
						class="btn preset-tonal-surface"
						onclick={() => (open = false)}
						disabled={applying}
					>
						Cancel
					</button>
					<button
						type="button"
						class="btn preset-filled-primary-500"
						onclick={apply}
						disabled={applying || max === 0}
						aria-busy={applying}
					>
						{#if applying}<Loader2 size={18} class="animate-spin" />{/if}
						<span>Apply</span>
					</button>
				</div>
			</Dialog.Content>
		</Dialog.Positioner>
	</ClientPortal>
</Dialog>
