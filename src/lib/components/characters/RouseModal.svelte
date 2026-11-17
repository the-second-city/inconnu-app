<script lang="ts">
	import { untrack } from 'svelte';
	import { Dialog } from '@skeletonlabs/skeleton-svelte';
	import { Droplets, Flame, Ghost, HandFist, RefreshCcw } from '@lucide/svelte';

	import { rouse } from '$lib/characterActions';
	import { hungerRiseChance, percent } from '$lib/rouse';
	import type { Character, RouseResult } from '$lib/types';
	import ClientPortal from '$lib/components/ClientPortal.svelte';
	import CountdownRing from './CountdownRing.svelte';
	import ToggleCard from './ToggleCard.svelte';
	import HungerDrops from './HungerDrops.svelte';
	import Humanity from './sheets/components/Humanity.svelte';
	import EmptyHunger from './sheets/components/hunger/Empty.svelte';
	import FilledHunger from './sheets/components/hunger/Filled.svelte';

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

	let count = $state(1); // The checks being rolled, for the request and the countdown
	let reroll = $state(false);
	let oblivion = $state(false);
	let rolling = $state(false);
	let remaining = $state(0); // The countdown while rolling

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

	const hunger = $derived(character.hunger ?? 0);
	// One choice per number of checks, each with the chance Hunger rises, and the Hunger it could
	// reach (every check failing). A failure at Hunger 5 risks frenzy instead.
	const choices = $derived(
		[1, 2, 3].map((checks) => {
			const chance = percent(hungerRiseChance(checks, canReroll && reroll));
			const frenzy = hunger + checks > 5;
			return {
				checks,
				worst: Math.min(5, hunger + checks),
				frenzy,
				detail:
					hunger >= 5
						? `${chance} chance of frenzy`
						: `${chance} chance Hunger rises${frenzy ? '; may frenzy' : ''}`
			};
		})
	);

	// The number of checks whose row is hovered, previewed on the current Hunger
	let previewing: number | null = $state(null);
	const previewHunger = $derived(Math.min(5, hunger + (previewing ?? 0)));

	const id = $props.id();

	/** Back to the options, as when the modal opens. */
	const reset = () => {
		result = null;
		error = null;
		previewing = null;
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
	const doRouse = async (checks = 1) => {
		if (rolling) return;
		count = checks;
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

	// The choice rows and their icon badges, as the Slake modal's
	const ROW =
		'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-surface-300-700/40';
	const BADGE = 'flex size-9 shrink-0 items-center justify-center rounded-full';

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
					<CountdownRing {remaining} {stepDelay} />
				{:else if result === null}
					<!-- Options -->
					{#if isGhoul}
						<!-- Ghouls don't roll: one row, saying what it costs -->
						<button
							type="button"
							class={[ROW, 'border-surface-600-400']}
							onclick={() => doRouse(1)}
							aria-label="Rouse"
							aria-describedby="{id}-ghoul"
						>
							<span class="{BADGE} preset-tonal-error"><HandFist size={18} /></span>
							<span class="flex grow flex-col leading-tight">
								<span class="font-semibold">Rouse</span>
								<span id="{id}-ghoul" class="text-error-600-400 text-sm">
									Ghouls don't roll: Rousing deals 1 Aggravated Health damage.
								</span>
							</span>
						</button>
					{:else}
						<!-- The Hunger there is now. A hovered choice's possible Hunger shows faintly. -->
						<div class="flex justify-center gap-2" role="img" aria-label="Current Hunger {hunger}">
							{#each Array(5), i (i)}
								{#if i < hunger}
									<FilledHunger size={28} />
								{:else if i < previewHunger}
									<span class="opacity-40"><FilledHunger size={28} /></span>
								{:else}
									<EmptyHunger size={28} />
								{/if}
							{/each}
						</div>

						<!-- Options, as toggle cards -->
						{#if canReroll || hasOblivion}
							<div class="flex flex-col gap-2">
								{#if canReroll}
									<ToggleCard
										icon={RefreshCcw}
										label="Re-roll failures"
										detail="A Blood Potency perk"
										bind:checked={reroll}
									/>
								{/if}
								{#if hasOblivion}
									<ToggleCard
										icon={Ghost}
										label="Apply Oblivion Stains"
										detail="For Oblivion: a 1 or 10 Stains"
										bind:checked={oblivion}
									/>
								{/if}
							</div>
						{/if}

						<!-- One row per number of checks: clicking one Rouses -->
						<div
							class="flex flex-col gap-2"
							role="group"
							aria-label="Checks to roll"
							onpointerleave={() => (previewing = null)}
						>
							{#each choices as choice (choice.checks)}
								<button
									type="button"
									class={[ROW, choice.frenzy ? 'border-warning-500' : 'border-surface-600-400']}
									onclick={() => doRouse(choice.checks)}
									onpointerenter={() => (previewing = choice.checks)}
									aria-label="Rouse {plural(choice.checks, 'Check', 'Checks')}"
									aria-describedby="{id}-checks-{choice.checks}"
								>
									<span
										class="{BADGE} {choice.frenzy
											? 'preset-tonal-warning'
											: 'preset-tonal-primary'}"
									>
										{#if choice.frenzy}<Flame size={18} />{:else}<Droplets size={18} />{/if}
									</span>
									<span class="flex grow flex-col leading-tight">
										<span class="font-semibold">{plural(choice.checks, 'Check', 'Checks')}</span>
										<span
											id="{id}-checks-{choice.checks}"
											class="text-sm {choice.frenzy
												? 'text-warning-600-400'
												: 'text-surface-800-200'}">{choice.detail}</span
										>
									</span>
									<!-- The Hunger it could reach, the possible rise faint -->
									<span class="flex shrink-0 gap-0.5" aria-hidden="true">
										{#each Array(5), i (i)}
											{#if i < hunger}
												<FilledHunger size={14} />
											{:else if i < choice.worst}
												<span class="opacity-40"><FilledHunger size={14} /></span>
											{:else}
												<EmptyHunger size={14} />
											{/if}
										{/each}
									</span>
								</button>
							{/each}
						</div>
					{/if}

					{#if error}
						<p class="text-error-500 text-sm" role="alert">{error}</p>
					{/if}

					<div class="flex justify-end gap-2">
						<button type="button" class="btn preset-tonal-surface" onclick={() => (open = false)}>
							Cancel
						</button>
					</div>
				{:else}
					<!-- Result -->
					<div class="space-y-3" role="status">
						{#if isGhoul}
							<p>{character.name} took 1 Aggravated Health damage.</p>
						{:else}
							<HungerDrops before={hungerBefore} after={result.hunger} />
							{#if result.frenzy}
								<p class="preset-tonal-error flex gap-2 rounded-md p-3 text-sm">
									<Flame size={18} class="shrink-0" />
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
