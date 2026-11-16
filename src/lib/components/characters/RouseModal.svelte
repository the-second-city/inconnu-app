<script lang="ts">
	import { untrack } from 'svelte';
	import { Dialog } from '@skeletonlabs/skeleton-svelte';
	import { Minus, Plus, TriangleAlert } from '@lucide/svelte';

	import { rouse } from '$lib/characterActions';
	import type { Character, RouseResult } from '$lib/types';
	import ClientPortal from '$lib/components/ClientPortal.svelte';
	import EmptyHunger from './sheets/components/hunger/Empty.svelte';
	import FilledHunger from './sheets/components/hunger/Filled.svelte';
	import Humanity from './sheets/components/Humanity.svelte';

	interface ComponentProps {
		open: boolean;
		character: Character;
		stepDelay?: number; // ms each check counts down, so the roll takes a moment, like a roll
	}

	let { open = $bindable(), character, stepDelay = 750 }: ComponentProps = $props();

	const isGhoul = $derived(character.splat === 'ghoul');
	const potency = $derived(character.potency ?? character.blood_potency ?? 0);
	// The options are shown only where they can matter: Blood Potency 0 never re-rolls, and Oblivion
	// Stains only come from Oblivion
	const canReroll = $derived(potency >= 1);
	const hasOblivion = $derived(
		character.traits.some((t) => t.type === 'discipline' && t.name.toLowerCase() === 'oblivion')
	);

	let count = $state(1);
	let reroll = $state(false);
	let oblivion = $state(false);
	let rolling = $state(false);
	let remaining = $state(0); // The countdown while rolling

	// The countdown ring's size, in its SVG's 100-unit box
	const RADIUS = 44;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
	let error: string | null = $state(null);
	let result: RouseResult | null = $state(null);
	let hungerBefore = $state(0);
	let stainsBefore = $state(0);

	// The character as the Rouse left it, for the Humanity tracker when it applied Stains. (The
	// character itself only updates once it's refetched.) The bot caps Stains at 10.
	const afterRouse: Character = $derived.by(() => ({
		...character,
		stains: Math.min(10, stainsBefore + (result?.stains ?? 0))
	}));

	/** Back to the options, as when the modal opens. */
	const reset = () => {
		result = null;
		error = null;
	};

	// Each opening starts at the options (the parent opens it by setting `open`)
	$effect(() => {
		if (open) untrack(reset);
	});

	/**
	 * Roll: the modal counts down from the number of checks (a ghoul's one Rouse) to 0, a step at a
	 * time, while the request runs, then shows the result (or the options again, with the error).
	 * If the API is slower than the countdown, it waits at 0.
	 */
	const doRouse = async () => {
		if (rolling) return;
		rolling = true;
		error = null;
		hungerBefore = character.hunger ?? 0;
		stainsBefore = character.stains ?? 0;
		remaining = isGhoul ? 1 : count;
		const request = rouse(character._id, {
			count,
			reroll: canReroll && reroll,
			oblivion_stains: hasOblivion && oblivion
		});
		while (remaining > 0) {
			await new Promise((resolve) => setTimeout(resolve, stepDelay));
			remaining--;
		}
		const outcome = await request;
		rolling = false;
		if (outcome.error !== undefined) error = outcome.error;
		else result = outcome.result;
	};

	/** "1 success", "2 successes" */
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
				<!-- A vampire's result is titled with its outcome: any failure raises Hunger (or, at Hunger 5,
				     risks frenzy) -->
				<Dialog.Title class="h5 text-center">
					{#if result && !isGhoul}
						{result.failures > 0 ? 'Hunger Increase' : 'Success'}
					{:else}
						Rouse Check
					{/if}
				</Dialog.Title>

				{#if rolling}
					<!-- Rolling: a countdown in a ring that starts full and sweeps empty over each step, then
					     refills for the next number. At 0 (waiting on a slow API), it stays empty. -->
					<div class="flex justify-center py-6">
						<div class="relative size-28">
							<svg viewBox="0 0 100 100" class="absolute inset-0 -rotate-90" aria-hidden="true">
								<circle
									cx="50"
									cy="50"
									r={RADIUS}
									class="stroke-surface-400-600"
									fill="none"
									stroke-width="6"
								/>
								{#if remaining > 0}
									{#key remaining}
										<circle
											cx="50"
											cy="50"
											r={RADIUS}
											class="sweep stroke-primary-500"
											fill="none"
											stroke-width="6"
											stroke-linecap="round"
											stroke-dasharray={CIRCUMFERENCE}
											style:--circumference={CIRCUMFERENCE}
											style:--step="{stepDelay}ms"
										/>
									{/key}
								{/if}
							</svg>
							<span
								class="absolute inset-0 flex items-center justify-center text-4xl font-semibold"
								aria-hidden="true">{remaining}</span
							>
						</div>
						<p class="sr-only" aria-live="polite">Rolling…</p>
					</div>
				{:else if result === null}
					<!-- Options -->
					{#if isGhoul}
						<p class="preset-tonal-warning flex gap-2 rounded-md p-3 text-sm">
							<TriangleAlert size={18} class="shrink-0" />
							<span>Ghouls don't roll: Rousing deals 1 Aggravated Health damage.</span>
						</p>
					{:else}
						<div class="flex items-center justify-between">
							<span id="rouse-count-label">Checks</span>
							<div class="flex items-center gap-3" role="group" aria-labelledby="rouse-count-label">
								<button
									type="button"
									class="btn-icon preset-tonal-surface"
									onclick={() => count--}
									disabled={count <= 1 || rolling}
									aria-label="Fewer checks"
								>
									<Minus size={16} />
								</button>
								<span class="w-4 text-center" aria-live="polite">{count}</span>
								<button
									type="button"
									class="btn-icon preset-tonal-surface"
									onclick={() => count++}
									disabled={count >= 3 || rolling}
									aria-label="More checks"
								>
									<Plus size={16} />
								</button>
							</div>
						</div>
						{#if canReroll}
							<label class="flex items-center gap-2">
								<input type="checkbox" class="checkbox" bind:checked={reroll} disabled={rolling} />
								<span>Re-roll failures</span>
							</label>
						{/if}
						{#if hasOblivion}
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									class="checkbox"
									bind:checked={oblivion}
									disabled={rolling}
								/>
								<span>Apply Oblivion Stains</span>
							</label>
						{/if}
					{/if}

					{#if error}
						<p class="text-error-500 text-sm" role="alert">{error}</p>
					{/if}

					<div class="flex justify-end gap-2">
						<button
							type="button"
							class="btn preset-tonal-surface"
							onclick={() => (open = false)}
							disabled={rolling}
						>
							Cancel
						</button>
						<button type="button" class="btn preset-filled-primary-500" onclick={doRouse}>
							Rouse
						</button>
					</div>
				{:else}
					<!-- Result -->
					<div class="space-y-3" role="status">
						{#if isGhoul}
							<p>{character.name} took 1 Aggravated Health damage.</p>
						{:else}
							<!-- Hunger leads, across the width: the Hunger already there is solid, and the
							     Hunger the Rouse added pulses (unless motion is reduced) -->
							<p class="sr-only">Hunger {hungerBefore} → {result.hunger}</p>
							<div class="flex justify-between px-4 py-2" aria-hidden="true">
								{#each Array(5), i (i)}
									{#if i < hungerBefore}
										<FilledHunger size={44} />
									{:else if i < result.hunger}
										<span class="motion-safe:animate-pulse" data-gained>
											<FilledHunger size={44} />
										</span>
									{:else}
										<EmptyHunger size={44} />
									{/if}
								{/each}
							</div>
							{#if result.frenzy}
								<p class="preset-tonal-error flex gap-2 rounded-md p-3 text-sm">
									<TriangleAlert size={18} class="shrink-0" />
									<span>A check failed at Hunger 5: test for Hunger frenzy.</span>
								</p>
							{/if}
							{#if result.stains > 0}
								<!-- The label above the track: beside it, ten boxes don't fit the modal -->
								<div class="grid gap-1">
									<Humanity character={afterRouse} editing={false} />
								</div>
								<p>{plural(result.stains, 'Oblivion Stain', 'Oblivion Stains')} applied.</p>
							{/if}
							{#if result.degeneration > 0}
								<p>Degeneration: {result.degeneration} Aggravated Willpower damage.</p>
							{/if}
						{/if}
					</div>

					<div class="flex justify-end gap-2">
						<button type="button" class="btn preset-tonal-surface" onclick={reset}>
							Rouse Again
						</button>
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

<style>
	/* A full ring that empties over one countdown step, easing in and out */
	.sweep {
		stroke-dashoffset: 0;
		animation: sweep var(--step) ease-in-out forwards;
	}

	@keyframes sweep {
		to {
			stroke-dashoffset: var(--circumference);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sweep {
			animation: none;
		}
	}
</style>
