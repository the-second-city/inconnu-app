<script lang="ts">
	import { untrack } from 'svelte';
	import { Dialog } from '@skeletonlabs/skeleton-svelte';
	import { Loader2, Minus, Plus } from '@lucide/svelte';

	import { damage } from '$lib/characterActions';
	import { takeDamage } from '$lib/damage';
	import type { Character, TrackType } from '$lib/types';
	import ClientPortal from '$lib/components/ClientPortal.svelte';
	import DamageTrack from './DamageTrack.svelte';

	interface ComponentProps {
		open: boolean;
		character: Character;
		track: TrackType;
	}

	let { open = $bindable(), character, track }: ComponentProps = $props();

	const trackLabel = $derived(track === 'willpower' ? 'Willpower' : 'Health');
	// The track the damage applies to. Applying freezes it: the save's live update brings the
	// damaged track while the modal closes, and previewing the same damage on that would show it
	// twice. Until then, it follows the character (say, damage taken in Discord meanwhile).
	let frozen: string | null = $state(null);
	const current = $derived(frozen ?? character[track]);

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
				frozen = null;
			});
		}
	});

	/**
	 * Deal the queued damage. On success the modal closes, and the sheet updates through the live
	 * update the save triggers; on failure it stays open, saying why.
	 */
	const apply = async () => {
		if (applying || superficial + aggravated === 0) return;
		applying = true;
		error = null;
		frozen = character[track];
		const outcome = await damage(character._id, { track, superficial, aggravated });
		applying = false;
		if (outcome.error !== undefined) {
			error = outcome.error;
			frozen = null; // Nothing was saved, so follow the character again
		} else {
			open = false;
		}
	};
</script>

{#snippet stepper(label: string, value: number, canAdd: boolean, set: (n: number) => void)}
	<div class="flex items-center justify-between">
		<span id="damage-{label.toLowerCase()}">{label}</span>
		<div
			class="flex items-center gap-3"
			role="group"
			aria-labelledby="damage-{label.toLowerCase()}"
		>
			<button
				type="button"
				class="btn-icon preset-tonal-surface"
				onclick={() => set(value - 1)}
				disabled={value <= 0}
				aria-label="Less {label}"
			>
				<Minus size={16} />
			</button>
			<span class="w-5 text-center" aria-live="polite">{value}</span>
			<button
				type="button"
				class="btn-icon preset-tonal-surface"
				onclick={() => set(value + 1)}
				disabled={!canAdd}
				aria-label="More {label}"
			>
				<Plus size={16} />
			</button>
		</div>
	</div>
{/snippet}

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

				<!-- The preview: the track as it would be, with the new damage pulsing -->
				<DamageTrack label={trackLabel} track={preview} before={current} markFrom="healthy" />

				{@render stepper('Superficial', superficial, !full, (n) => (superficial = n))}
				{@render stepper('Aggravated', aggravated, !full, (n) => (aggravated = n))}

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
						disabled={applying || superficial + aggravated === 0}
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
