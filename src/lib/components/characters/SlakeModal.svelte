<script lang="ts">
	import { untrack } from 'svelte';
	import { Dialog } from '@skeletonlabs/skeleton-svelte';
	import { Loader2 } from '@lucide/svelte';

	import { slake } from '$lib/characterActions';
	import type { Character } from '$lib/types';
	import ClientPortal from '$lib/components/ClientPortal.svelte';
	import HungerDrops from './HungerDrops.svelte';
	import Stepper from './Stepper.svelte';

	interface ComponentProps {
		open: boolean;
		character: Character;
	}

	let { open = $bindable(), character }: ComponentProps = $props();

	// The Hunger slaked from. Applying freezes it: the save's live update brings the new Hunger while
	// the modal closes, and previewing the same slaking on that would show it twice.
	let frozen: number | null = $state(null);
	const hunger = $derived(frozen ?? character.hunger ?? 0);

	let amount = $state(1);
	let applying = $state(false);
	let error: string | null = $state(null);

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

	/** Slake. On success the modal closes, and the live update refreshes the sheet. */
	const apply = async () => {
		if (applying || amount < 1) return;
		applying = true;
		error = null;
		frozen = character.hunger ?? 0;
		const outcome = await slake(character._id, { amount });
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
				<Dialog.Title class="h5 text-center">Slake Hunger</Dialog.Title>

				<!-- The preview: the Hunger left, with the Hunger slaked pulsing -->
				<HungerDrops before={hunger} after={Math.max(0, hunger - amount)} />

				<Stepper label="Hunger" bind:value={amount} min={1} max={hunger} disabled={applying} />

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
						disabled={applying || hunger === 0}
						aria-busy={applying}
					>
						{#if applying}<Loader2 size={18} class="animate-spin" />{/if}
						<span>Slake</span>
					</button>
				</div>
			</Dialog.Content>
		</Dialog.Positioner>
	</ClientPortal>
</Dialog>
