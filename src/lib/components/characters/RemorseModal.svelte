<script lang="ts">
	import { plural } from '$lib';
	import { untrack } from 'svelte';
	import { Dialog } from '@skeletonlabs/skeleton-svelte';
	import { Eclipse } from '@lucide/svelte';

	import { bloodPotency } from '$lib/vampire';
	import { atLeast, wait } from '$lib/busy';
	import { remorse } from '$lib/characterActions';
	import { successesLast } from '$lib/dice';
	import { baneSeverity, remorseDice } from '$lib/remorse';
	import type { Character, RemorseResult } from '$lib/types';
	import ClientPortal from '$lib/components/ClientPortal.svelte';
	import RollingDice from './RollingDice.svelte';
	import ToggleCard from './ToggleCard.svelte';
	import Humanity from './sheets/components/Humanity.svelte';

	interface ComponentProps {
		open: boolean;
		character: Character;
		stepDelay?: number; // ms the dice tumble at least, as a Rouse check counts down
		revealDelay?: number; // ms between dice revealing their numbers
	}

	let {
		open = $bindable(),
		character,
		stepDelay = 750,
		revealDelay = 650
	}: ComponentProps = $props();

	// The roll happens in place: Roll locks the options, the ghost dice start tumbling one after
	// another, and once the bot answers, each reveals its number in turn; then the title, Humanity,
	// and text become the outcome's.
	type Phase = 'options' | 'rolling' | 'revealing' | 'done';
	let phase = $state<Phase>('options');
	const locked = $derived(phase !== 'options');

	// The character as the roll began. The test's live update brings the new Humanity (and clears the
	// Stains) while the dice are still revealing, which would change the dice and the text under them.
	let rolledFrom: Character | null = $state(null);
	const shown = $derived(rolledFrom ?? character);
	const humanity = $derived(shown.humanity ?? 7);
	const stains = $derived(shown.stains ?? 0);

	// The Lasombra alternative Bane rolls Bane Severity fewer dice. Only vampires have a clan Bane
	// (the app doesn't know the clan, so it's up to the player).
	const severity = $derived(shown.splat === 'vampire' ? baneSeverity(bloodPotency(shown)) : 0);
	let lasombra = $state(false);
	const dice = $derived(
		remorseDice(humanity, stains, { lasombraBane: lasombra && severity > 0 ? severity : null })
	);
	// The dice without the Bane, so the ones it removes can show, crossed out
	const baseDice = $derived(remorseDice(humanity, stains));
	const removed = $derived(baseDice - dice);

	let error: string | null = $state(null);
	let result = $state<RemorseResult | null>(null);
	let revealed = $state(0); // How many of the result's dice show their numbers

	// The faces in the row: the result's dice once known (they decide the count), else ghosts
	const faces: (number | null)[] = $derived.by(() => {
		const rolled = result?.dice;
		if (!rolled) return Array(dice).fill(null);
		return rolled.map((die, i) => (i < revealed ? die : null));
	});

	// The character as the test left it, for the Humanity tracker: the Stains clear either way
	const afterTest: Character = $derived.by(() => ({
		...shown,
		humanity: result?.humanity ?? humanity,
		stains: 0
	}));

	// Each opening starts at the options (the parent opens it by setting `open`)
	$effect(() => {
		if (open) {
			untrack(() => {
				phase = 'options';
				rolledFrom = null;
				result = null;
				revealed = 0;
				error = null;
				lasombra = false;
			});
		}
	});

	/**
	 * Roll in place: the dice tumble for at least `stepDelay` while the request runs, then reveal one
	 * at a time (failures first, then successes), and the outcome paints in. On an error, the options unlock again, saying why.
	 */
	const doRemorse = async () => {
		if (locked || stains === 0) return;
		phase = 'rolling';
		error = null;
		rolledFrom = $state.snapshot(character);
		const outcome = await atLeast(
			remorse(character._id, { min_override: 1, lasombra_alt: lasombra && severity > 0 }),
			stepDelay
		);
		if (outcome.error !== undefined) {
			error = outcome.error;
			rolledFrom = null;
			phase = 'options';
			return;
		}
		// Successes move to the end, so the reveal builds to them
		result = { ...outcome.result, dice: successesLast(outcome.result.dice) };
		phase = 'revealing';
		revealed = 0;
		while (revealed < outcome.result.dice.length) {
			await wait(revealDelay);
			revealed++;
		}
		phase = 'done';
	};
</script>

<Dialog
	{open}
	onOpenChange={(e) => (open = e.open)}
	closeOnInteractOutside={false}
	closeOnEscape={!locked || phase === 'done'}
>
	<ClientPortal>
		<Dialog.Backdrop class="modal-backdrop-gothic fixed inset-0 z-50" />
		<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<Dialog.Content class="card modal-gothic w-full max-w-sm space-y-4 p-6">
				<!-- Once the dice are in, titled with the outcome, as /remorse's is -->
				<Dialog.Title class="h5 font-display text-center tracking-[0.02em]">
					{#if phase === 'done' && result}
						{result.remorseful ? 'Remorse Success' : 'Remorse Failure'}
					{:else}
						Remorse Test
					{/if}
				</Dialog.Title>

				<!-- Humanity: as it is, then as the test left it. The label goes above the track, since
				     beside it, ten boxes don't fit; centered as a block, the label at the track's edge. -->
				<div class="flex justify-center">
					<div class="grid gap-1">
						<Humanity character={phase === 'done' ? afterTest : shown} editing={false} />
					</div>
				</div>

				<!-- The dice: blank faces until rolled (any the Lasombra Bane removes crossed out), then
				     tumbling, then revealed -->
				<RollingDice
					{faces}
					rolling={locked}
					removed={result ? 0 : removed}
					label={phase === 'done' && result
						? `Dice: ${result.dice.join(', ')}`
						: `${locked ? 'Rolling ' : ''}${plural(dice, 'die', 'dice')}${
								removed > 0 ? `, ${removed} removed by the Lasombra Bane` : ''
							}`}
				/>

				<!-- The outcome takes the description's place, in the same size, and the Lasombra card
				     stays (locked), so the modal keeps its height -->
				{#if phase === 'done' && result}
					<p class="text-sm" role="status">
						{#if result.remorseful}
							You keep the Beast at bay. For now. Humanity remains at {result.humanity}.
						{:else}
							The downward spiral continues… Humanity drops from {humanity} to {result.humanity}.
						{/if}
					</p>
				{:else}
					<p class="text-sm">
						Roll {plural(dice, 'die', 'dice')}. Any 6 or higher keeps Humanity at {humanity};
						otherwise it drops to {Math.max(0, humanity - 1)}. Either way, the Stains clear.
					</p>
				{/if}

				{#if severity > 0}
					<ToggleCard
						icon={Eclipse}
						label="Lasombra alternative Bane"
						detail="{plural(severity, 'die', 'dice')} fewer (Bane Severity), at least 1"
						bind:checked={lasombra}
						disabled={locked}
					/>
				{/if}

				{#if error}
					<p class="text-error-500 text-sm" role="alert">{error}</p>
				{/if}

				<div class="flex justify-end gap-2">
					{#if phase === 'done'}
						<button
							type="button"
							class="btn preset-filled-primary-500"
							onclick={() => (open = false)}
						>
							Done
						</button>
					{:else}
						<button
							type="button"
							class="btn preset-tonal-surface"
							onclick={() => (open = false)}
							disabled={locked}
						>
							Cancel
						</button>
						<button
							type="button"
							class="btn preset-filled-primary-500"
							onclick={doRemorse}
							disabled={locked || stains === 0}
							aria-busy={locked}
						>
							Roll
						</button>
					{/if}
				</div>
			</Dialog.Content>
		</Dialog.Positioner>
	</ClientPortal>
</Dialog>
