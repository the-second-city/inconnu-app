<script lang="ts">
	import { untrack } from 'svelte';
	import { Dialog } from '@skeletonlabs/skeleton-svelte';

	import { remorse } from '$lib/characterActions';
	import { baneSeverity, remorseDice, remorseSuccess } from '$lib/remorse';
	import type { Character, RemorseResult } from '$lib/types';
	import ClientPortal from '$lib/components/ClientPortal.svelte';
	import CountdownRing from './CountdownRing.svelte';
	import Humanity from './sheets/components/Humanity.svelte';

	interface ComponentProps {
		open: boolean;
		character: Character;
		stepDelay?: number; // ms the roll counts down, as a Rouse check does
	}

	let { open = $bindable(), character, stepDelay = 750 }: ComponentProps = $props();

	const humanity = $derived(character.humanity ?? 7);
	const stains = $derived(character.stains ?? 0);

	// The Lasombra alternative Bane rolls Bane Severity fewer dice. Only vampires have a clan Bane
	// (the app doesn't know the clan, so it's up to the player).
	const severity = $derived(
		character.splat === 'vampire'
			? baneSeverity(character.potency ?? character.blood_potency ?? 0)
			: 0
	);
	let lasombra = $state(false);
	const dice = $derived(
		remorseDice(humanity, stains, { lasombraBane: lasombra && severity > 0 ? severity : null })
	);

	let rolling = $state(false);
	let error: string | null = $state(null);
	let result: RemorseResult | null = $state(null);
	let humanityBefore = $state(0);

	// The character as the test left it, for the Humanity tracker: the Stains clear either way. (The
	// character itself only updates once it's refetched.)
	const afterTest: Character = $derived.by(() => ({
		...character,
		humanity: result?.humanity ?? humanity,
		stains: 0
	}));

	// Each opening starts at the options (the parent opens it by setting `open`)
	$effect(() => {
		if (open) {
			untrack(() => {
				result = null;
				error = null;
				lasombra = false;
			});
		}
	});

	/**
	 * Roll: the modal counts down one step, as a Rouse check does, while the request runs, then shows
	 * the result (or the options again, with the error). If the API is slower, it waits at 0.
	 */
	const doRemorse = async () => {
		if (rolling || stains === 0) return;
		rolling = true;
		error = null;
		humanityBefore = humanity;
		const request = remorse(character._id, {
			min_override: 1,
			lasombra_alt: lasombra && severity > 0
		});
		await new Promise((resolve) => setTimeout(resolve, stepDelay));
		const outcome = await request;
		rolling = false;
		if (outcome.error !== undefined) error = outcome.error;
		else result = outcome.result;
	};

	/** "1 die", "2 dice" */
	const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
</script>

<Dialog
	{open}
	onOpenChange={(e) => (open = e.open)}
	closeOnInteractOutside={false}
	closeOnEscape={!rolling}
>
	<ClientPortal>
		<Dialog.Backdrop class="bg-surface-950/70 fixed inset-0 z-50 backdrop-blur-sm" />
		<Dialog.Positioner class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<Dialog.Content
				class="card bg-surface-200-800 border-surface-400-600 w-full max-w-sm space-y-4 border p-6 shadow-2xl"
			>
				<!-- The result is titled with its outcome, as /remorse's is -->
				<Dialog.Title class="h5 text-center">
					{#if result}
						{result.remorseful ? 'Remorse Success' : 'Remorse Failure'}
					{:else}
						Remorse Test
					{/if}
				</Dialog.Title>

				{#if rolling}
					<CountdownRing remaining={1} {stepDelay} />
				{:else if result === null}
					<!-- Options. The label goes above the track, since beside it, ten boxes don't fit. -->
					<div class="grid gap-1">
						<Humanity {character} editing={false} />
					</div>

					<p class="text-sm">
						Roll {plural(dice, 'die', 'dice')}. Any 6 or higher keeps Humanity at {humanity};
						otherwise it drops to {Math.max(0, humanity - 1)}. Either way, the Stains clear.
					</p>

					{#if severity > 0}
						<label class="flex items-center gap-2">
							<input type="checkbox" class="checkbox" bind:checked={lasombra} />
							<span>Lasombra alternative Bane ({severity} fewer dice)</span>
						</label>
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
							onclick={doRemorse}
							disabled={stains === 0}
						>
							Roll
						</button>
					</div>
				{:else}
					<!-- Result -->
					<div class="space-y-3" role="status">
						<!-- The dice, successes (6+) in blue, as /remorse's success color -->
						<div
							class="flex flex-wrap justify-center gap-2"
							role="img"
							aria-label="Dice: {result.dice.join(', ')}"
						>
							{#each result.dice as die, i (i)}
								<span
									class={[
										'flex size-10 items-center justify-center rounded-md text-lg font-semibold',
										remorseSuccess(die) ? 'preset-filled-secondary-500' : 'preset-tonal-surface'
									]}
								>
									{die}
								</span>
							{/each}
						</div>

						<div class="grid gap-1">
							<Humanity character={afterTest} editing={false} />
						</div>

						{#if result.remorseful}
							<p>You keep the Beast at bay. For now. Humanity remains at {result.humanity}.</p>
						{:else}
							<p>
								The downward spiral continues… Humanity drops from {humanityBefore} to {result.humanity}.
							</p>
						{/if}
					</div>

					<div class="flex justify-end gap-2">
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
