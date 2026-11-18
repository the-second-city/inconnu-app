<script lang="ts">
	import { untrack } from 'svelte';
	import { Dialog } from '@skeletonlabs/skeleton-svelte';
	import { Droplets, Flame, HeartPlus, Moon, Tombstone } from '@lucide/svelte';

	import { isVampiric } from '$lib/vampire';
	import { atLeast, wait } from '$lib/busy';
	import { mend } from '$lib/characterActions';
	import { countBoxes, healDamage, mendAmount } from '$lib/damage';
	import { isSuccess, successesLast } from '$lib/dice';
	import { hungerRiseChance, percent } from '$lib/rouse';
	import type { Character, MendResult, TrackType } from '$lib/types';
	import ClientPortal from '$lib/components/ClientPortal.svelte';
	import DamageTrack from './DamageTrack.svelte';
	import HungerDrops from './HungerDrops.svelte';
	import RollingDice from './RollingDice.svelte';
	import EmptyHunger from './sheets/components/hunger/Empty.svelte';
	import FilledHunger from './sheets/components/hunger/Filled.svelte';

	interface ComponentProps {
		open: boolean;
		character: Character;
		type: 'superficial' | 'aggravated';
		track?: TrackType; // Health mends as /mend and /aggheal do; Willpower recovers as /awaken does
		stepDelay?: number; // ms the Rouse dice tumble at least (or the heal takes, without them)
		revealDelay?: number; // ms between the Rouse dice revealing their numbers
		handoffDelay?: number; // ms the revealed dice show before crossfading to Hunger
	}

	let {
		open = $bindable(),
		character,
		type,
		track = 'health',
		stepDelay = 750,
		revealDelay = 650,
		handoffDelay = 1000
	}: ComponentProps = $props();

	// The heal happens in place, as Remorse rolls: Mend locks the buttons, the Rouse dice (if any)
	// tumble and then reveal one at a time, and the outcome paints in: the title, the healed track,
	// what it healed, and the cost card's Hunger.
	type Phase = 'start' | 'rolling' | 'revealing' | 'done';
	let phase = $state<Phase>('start');
	const locked = $derived(phase !== 'start');

	// The character as the heal began. Its live update arrives while the dice are still revealing,
	// which would change the track and Hunger under them.
	let healedFrom: Character | null = $state(null);
	const shown = $derived(healedFrom ?? character);

	const isWillpower = $derived(track === 'willpower');
	const trackLabel = $derived(isWillpower ? 'Willpower' : 'Health');
	const isVampire = $derived(isVampiric(shown.splat));
	const isAggravated = $derived(type === 'aggravated');
	// Vampires Rouse to heal Health: once to mend, three times for Aggravated. Others, and Willpower,
	// don't.
	const rouses = $derived(isVampire && !isWillpower ? (isAggravated ? 3 : 1) : 0);

	let error: string | null = $state(null);
	let result = $state<MendResult | null>(null);
	let revealed = $state(0); // How many of the Rouse dice show their numbers
	let showHunger = $state(false); // The revealed dice have given way to the Hunger they left

	// The Rouse dice: the result's once known (successes last), else blank faces
	const faces: (number | null)[] = $derived.by(() => {
		const rolled = result?.dice;
		if (!rolled) return Array(rouses).fill(null);
		return rolled.map((die, i) => (i < revealed ? die : null));
	});

	// Each opening starts over (the parent opens it by setting `open`)
	$effect(() => {
		if (open) {
			untrack(() => {
				phase = 'start';
				healedFrom = null;
				result = null;
				revealed = 0;
				showHunger = false;
				error = null;
			});
		}
	});

	/**
	 * Heal in place: the Rouse dice tumble for at least `stepDelay` while the request runs (a beat
	 * without them), then reveal one at a time (failures first, then successes), and the outcome
	 * paints in. On an error, the buttons unlock again, saying why.
	 */
	const doMend = async () => {
		if (locked) return;
		phase = 'rolling';
		error = null;
		healedFrom = $state.snapshot(character);
		const outcome = await atLeast(mend(character._id, { type, track }), stepDelay);
		if (outcome.error !== undefined) {
			error = outcome.error;
			healedFrom = null;
			phase = 'start';
			return;
		}
		result = { ...outcome.result, dice: successesLast(outcome.result.dice) };
		phase = 'revealing';
		revealed = 0;
		while (revealed < result.dice.length) {
			await wait(revealDelay);
			revealed++;
		}
		phase = 'done';
		// After a moment with the dice, they crossfade to the Hunger they left
		const shownResult = result;
		if (rouses > 0) {
			await wait(handoffDelay);
			if (result === shownResult) showHunger = true;
		}
	};

	// Once the dice are in, the outcome
	const outcome = $derived(phase === 'done' ? result : null);

	const actionLabel = $derived(
		isWillpower ? (isAggravated ? 'Heal' : 'Recover') : isAggravated ? 'Heal' : 'Mend'
	);
	// The track as the heal would leave it, to mark the damage it takes away, and how much it heals
	const preview = $derived(
		healDamage(shown[track], type, mendAmount(shown, type, isWillpower ? 'willpower' : 'health'))
	);
	const healed = $derived(
		countBoxes(outcome?.track ?? preview, '.') - countBoxes(shown[track], '.')
	);
	const kind = $derived(isAggravated ? 'Aggravated' : 'Superficial');
	const healing = $derived.by(() => {
		const verb = isWillpower && !isAggravated ? 'Recover' : isAggravated ? 'Heal' : 'Mend';
		const said = outcome ? (verb === 'Mend' ? 'Mended' : `${verb}ed`) : `${verb}s`;
		return `${said} ${healed} ${kind} ${trackLabel} damage`;
	});

	// What the heal costs, as a card like the Slake and Rouse rows: vampires Rouse for Health, with
	// the chance Hunger rises and the Hunger it could reach. A failure at Hunger 5 risks frenzy when
	// mending; healing Aggravated past Hunger 5 means torpor. Once healed, it says how the Rouses
	// went, and its meter shows the Hunger they left.
	const hunger = $derived(shown.hunger ?? 0);
	const worstHunger = $derived(Math.min(5, hunger + rouses));
	const cost = $derived.by(() => {
		if (rouses > 0) {
			const chance = percent(hungerRiseChance(rouses, false));
			const risk = isAggravated ? 'torpor' : 'frenzy';
			// Frenzy needs a failure at Hunger 5; torpor, more failures than Hunger has room for. Once
			// healed, the warning stays only if it happened.
			const risky = outcome
				? outcome.frenzy || outcome.torpor
				: isAggravated
					? hunger + rouses > 5
					: hunger >= 5;
			const failed = outcome?.dice.some((die) => !isSuccess(die)) ?? true;
			return {
				icon: risky ? (isAggravated ? Tombstone : Flame) : Droplets,
				badge: risky
					? 'preset-tonal-warning'
					: failed
						? 'preset-tonal-primary'
						: 'preset-tonal-success',
				title: rouses === 1 ? '1 Rouse Check' : `${rouses} Rouse Checks`,
				detail: outcome
					? rouseOutcome(outcome)
					: hunger >= 5
						? `${chance} chance of ${risk}`
						: `${chance} chance Hunger rises${risky ? `; may cause ${risk}` : ''}`,
				risky
			};
		}
		const free = { icon: HeartPlus, badge: 'preset-tonal-success', risky: false };
		if (isWillpower && !isAggravated) {
			return {
				...free,
				icon: Moon,
				title: "A night's rest",
				detail: 'The higher of Resolve and Composure'
			};
		}
		return {
			...free,
			title: isWillpower ? 'No cost' : 'No Rouse Check',
			detail: isWillpower
				? 'Willpower heals without Rousing'
				: `${shown.splat === 'ghoul' ? 'Ghouls' : 'Mortals'} heal without Rousing`
		};
	});
	const costId = $props.id();

	/** What the Rouses did: whether any failed, and what that did to Hunger. */
	function rouseOutcome(healedWith: MendResult): string {
		const failures = healedWith.dice.filter((die) => !isSuccess(die)).length;
		const checks = healedWith.dice.length;
		if (failures === 0) {
			const passed =
				checks === 1 ? 'Rouse Check succeeded' : `All ${checks} Rouse Checks succeeded`;
			return `${passed}. Hunger stays at ${healedWith.hunger}.`;
		}
		const failed =
			checks === 1 ? 'Rouse Check failed' : `${failures} of ${checks} Rouse Checks failed`;
		// At Hunger 5 there's no room to rise; the frenzy or torpor warning says what it means
		if (healedWith.hunger > hunger) return `${failed}. Hunger rises to ${healedWith.hunger}.`;
		if (healedWith.hunger >= 5) return `${failed} at Hunger 5.`;
		return `${failed}. Hunger stays at ${healedWith.hunger}.`;
	}

	// The cost card's meter: the Hunger it could reach (the possible rise faint), then the Hunger the
	// Rouses left (what they added pulsing)
	const meterHunger = $derived(outcome ? outcome.hunger : worstHunger);

	const title = $derived.by(() => {
		if (isWillpower) {
			if (outcome) return 'Willpower Recovered';
			return isAggravated ? 'Heal Aggravated Willpower' : 'Recover Willpower';
		}
		if (outcome) return isAggravated ? 'Aggravated Damage Healed' : 'Damage Mended';
		return isAggravated ? 'Heal Aggravated Damage' : 'Mend Damage';
	});
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
				<Dialog.Title class="h5 font-display text-center tracking-[0.02em]">
					{title}
				</Dialog.Title>

				<!-- The track: as it is, the damage the heal would take away pulsing (the heal frees the
				     boxes next to the healthy ones); then as healed, the freed boxes pulsing -->
				{#if outcome}
					<DamageTrack label={trackLabel} track={outcome.track} before={shown[track]} />
				{:else}
					<DamageTrack
						label={trackLabel}
						track={shown[track]}
						before={preview}
						markFrom="healthy"
					/>
				{/if}

				{#if rouses > 0}
					<!-- The dice, then, a moment after they're in, the Hunger they left (gains pulsing), in
					     the same place: stacked in one grid cell, crossfading, so the height holds -->
					<div class="grid items-center">
						<div
							class={[
								'col-start-1 row-start-1 transition-opacity duration-500',
								showHunger && 'opacity-0'
							]}
						>
							<RollingDice
								{faces}
								rolling={locked}
								label={outcome
									? `Rouse dice: ${outcome.dice.join(', ')}`
									: `${locked ? 'Rolling ' : ''}${rouses === 1 ? '1 Rouse die' : `${rouses} Rouse dice`}`}
							/>
						</div>
						<!-- Always there (unseen until the crossfade), so its height is reserved from the start -->
						<div
							class={[
								'col-start-1 row-start-1 transition-opacity duration-500',
								showHunger ? 'opacity-100' : 'opacity-0'
							]}
							aria-hidden="true"
						>
							<HungerDrops before={hunger} after={outcome?.hunger ?? hunger} />
						</div>
					</div>
				{/if}

				<!-- What it heals and costs; once healed, what it did -->
				<div class="space-y-4" role={outcome ? 'status' : undefined}>
					<p class="text-sm">{healing}</p>

					<div
						class={[
							'flex items-center gap-3 rounded-lg border px-3 py-2',
							cost.risky ? 'border-warning-500' : 'border-surface-600-400'
						]}
						role="group"
						aria-label="Cost: {cost.title}"
						aria-describedby="{costId}-cost"
					>
						<span
							class="flex size-9 shrink-0 items-center justify-center rounded-full {cost.badge}"
						>
							<cost.icon size={18} />
						</span>
						<span class="flex grow flex-col leading-tight">
							<span class="font-semibold">{cost.title}</span>
							<span
								id="{costId}-cost"
								class={[
									'text-sm',
									cost.risky ? 'text-warning-600-400' : 'text-surface-800-200',
									// Two lines held for the Rouses' outcome, which runs longer than the odds
									rouses > 0 && 'min-h-[2lh]'
								]}>{cost.detail}</span
							>
						</span>
						{#if rouses > 0}
							{#if outcome}<span class="sr-only">Hunger {hunger} → {outcome.hunger}</span>{/if}
							<span class="flex shrink-0 gap-0.5" aria-hidden="true">
								{#each Array(5), i (i)}
									{#if i < hunger}
										<FilledHunger size={14} />
									{:else if i < meterHunger && outcome}
										<span class="motion-safe:animate-pulse" data-gained>
											<FilledHunger size={14} />
										</span>
									{:else if i < meterHunger}
										<span class="opacity-40"><FilledHunger size={14} /></span>
									{:else}
										<EmptyHunger size={14} />
									{/if}
								{/each}
							</span>
						{/if}
					</div>

					{#if outcome?.frenzy}
						<p class="preset-tonal-error flex gap-2 rounded-md p-3 text-sm">
							<Flame size={18} class="shrink-0" />
							<span>A Rouse failed at Hunger 5: test for Hunger frenzy.</span>
						</p>
					{/if}
					{#if outcome?.torpor}
						<p class="preset-tonal-error flex gap-2 rounded-md p-3 text-sm">
							<Tombstone size={18} class="shrink-0" />
							<span>Hunger would pass 5: {shown.name} falls into torpor.</span>
						</p>
					{/if}
				</div>

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
							onclick={doMend}
							disabled={locked}
							aria-busy={locked}
						>
							{actionLabel}
						</button>
					{/if}
				</div>
			</Dialog.Content>
		</Dialog.Positioner>
	</ClientPortal>
</Dialog>
