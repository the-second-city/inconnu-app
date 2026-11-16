<script lang="ts">
	import { untrack } from 'svelte';
	import { Dialog } from '@skeletonlabs/skeleton-svelte';
	import { Minus, Plus } from '@lucide/svelte';

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

	// Each opening starts with no damage queued (the parent opens it by setting `open`)
	$effect(() => {
		if (open) {
			untrack(() => {
				superficial = 0;
				aggravated = 0;
			});
		}
	});
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

<Dialog {open} onOpenChange={(e) => (open = e.open)} closeOnInteractOutside={false}>
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

				<!-- Not wired up yet: the bot's endpoint is still to come -->
				<p class="text-surface-200 text-center text-xs">Applying damage isn't available yet.</p>

				<div class="flex justify-end gap-2">
					<button type="button" class="btn preset-tonal-surface" onclick={() => (open = false)}>
						Cancel
					</button>
					<button type="button" class="btn preset-filled-primary-500" disabled>Apply</button>
				</div>
			</Dialog.Content>
		</Dialog.Positioner>
	</ClientPortal>
</Dialog>
