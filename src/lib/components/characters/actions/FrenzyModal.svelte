<script lang="ts">
	import { plural } from '../../..';
	import { untrack } from 'svelte';
	import { Brain, HandFist, Minus, Plus } from '@lucide/svelte';

	import { bloodPotency } from '$lib/rules/vampire';
	import { wait } from '$lib/state/busy';
	import { countSuccesses } from '$lib/rules/dice';
	import { frenzy } from '$lib/api/characterActions';
	import {
		DREAM_REROLLS,
		dreamRerolled,
		FRENZY_DIFFICULTY,
		FRENZY_ADVANTAGES,
		frenzyPool,
		penaltyDice,
		MAX_FRENZY_BONUS
	} from '$lib/rules/frenzy';
	import type { Character, FrenzyPenalty, FrenzyAdvantage, FrenzyResult } from '$lib/types';
	import { RollInPlace } from '$lib/state/rollInPlace.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ModalActions from '$lib/components/ui/ModalActions.svelte';
	import RollingDice from './RollingDice.svelte';
	import Stepper from '$lib/components/ui/Stepper.svelte';
	import ToggleCard from '$lib/components/ui/ToggleCard.svelte';

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

	// The roll happens in place, as Remorse's: Roll locks the options, the dice tumble, and once the
	// bot answers, each reveals its number in turn (then The Dream's re-rolls); then the title and
	// text become the outcome's.
	const roll = new RollInPlace(() => character);

	// The character as the roll began, so its live update can't change the pool mid-reveal

	let difficulty = $state(3);
	let penalty = $state<FrenzyPenalty | null>(null);
	let bonus = $state(0); // Flat bonus dice
	let advantages = $state<FrenzyAdvantage[]>([]); // Any number, and with bonus dice too
	const dreaming = $derived(advantages.includes('the_dream'));

	/** Turn an advantage on or off. */
	const toggleAdvantage = (advantage: FrenzyAdvantage) => {
		advantages = advantages.includes(advantage)
			? advantages.filter((a) => a !== advantage)
			: [...advantages, advantage];
	};

	// The penalties are clan Banes and Compulsions, so thin-bloods (clanless) get neither. Brujah
	// Fury takes Bane Severity, so it's offered only with a Bane. The app doesn't know clans, so
	// it's up to the player, as with Remorse's Lasombra Bane.
	const clanned = $derived(roll.shown.splat === 'vampire');
	const severity = $derived(penaltyDice('brujah', bloodPotency(roll.shown)));
	const pool = $derived(frenzyPool(roll.shown, { penalty, bonus, advantages }));

	/** Check or uncheck a penalty card: checking one unchecks the other. */
	const setPenalty = (value: FrenzyPenalty, on: boolean) => {
		if (on) penalty = value;
		else if (penalty === value) penalty = null;
	};

	let result = $state<FrenzyResult | null>(null);
	let revealedFaces = $state<(number | null)[]>([]); // The result's dice as they reveal
	let rerolling = $state(false); // The Dream's re-rolls tumble together, not one after another

	// The faces in the row: the result's once known (they decide the count), else ghosts
	const faces: (number | null)[] = $derived(result ? revealedFaces : Array(pool.total).fill(null));

	// Each opening starts at the options (the parent opens it by setting `open`)
	$effect(() => {
		if (open) {
			untrack(() => {
				roll.reset();
				result = null;
				revealedFaces = [];
				rerolling = false;
				difficulty = 3;
				penalty = null;
				bonus = 0;
				advantages = [];
			});
		}
	});

	/**
	 * Roll in place: the dice tumble for at least `stepDelay` while the request runs, then reveal one
	 * at a time in the order rolled (the faces before The Dream's re-roll, if used). The dice it
	 * re-rolled then tumble together and reveal their final faces in turn. On an error, the options
	 * unlock again, saying why.
	 */
	const doFrenzy = async () => {
		const rolled = await roll.roll(
			() =>
				frenzy(character._id, {
					difficulty,
					penalty,
					bonus,
					advantages: $state.snapshot(advantages)
				}),
			stepDelay
		);
		if (!rolled) return;
		const { dice, original } = rolled;
		const first = original ?? dice;
		result = rolled;
		revealedFaces = first.map(() => null);
		for (const [i, die] of first.entries()) {
			await wait(revealDelay);
			revealedFaces[i] = die;
		}

		const rerolled = original ? dreamRerolled(original) : [];
		if (rerolled.length > 0) {
			await wait(revealDelay);
			rerolling = true;
			for (const i of rerolled) revealedFaces[i] = null;
			await wait(revealDelay / 2);
			for (const i of rerolled) {
				revealedFaces[i] = dice[i];
				await wait(revealDelay);
			}
		}
		// The bot's final faces, whichever dice it re-rolled
		revealedFaces = [...dice];
		roll.finish();
	};

	// How the pool is made, for the description
	const poolParts = $derived.by(() => {
		const parts = [
			`Willpower ${pool.willpower}`,
			`${pool.humanityThird} for Humanity ${pool.humanity}`
		];
		if (pool.removed > 0) {
			parts.push(
				`−${pool.removed} for ${penalty === 'brujah' ? 'Brujah Fury' : 'Malkavian Terror'}`
			);
		}
		if (pool.bonus > 0) parts.push(`+${pool.bonus}`);
		for (const advantage of pool.applied) {
			if (advantage.dice > 0) parts.push(`+${advantage.dice} from ${advantage.name}`);
		}
		return parts.join(', ');
	});
</script>

<Modal bind:open closeOnEscape={roll.closable}>
	<!-- Once the dice are in, titled with the outcome, as /frenzy's update is -->
	{#snippet title()}
		{#if roll.done && result}
			{result.critical ? 'Critical Success' : result.passed ? 'Frenzy Success' : 'Frenzy Failure'}
		{:else}
			Frenzy Test
		{/if}
	{/snippet}

	<!-- The Difficulty is what the roll is against, so it leads: a large numeral, centered,
	     weighty enough to hold its own above the dice -->
	<div class="flex flex-col items-center gap-1">
		<span
			id="frenzy-difficulty"
			class="font-display text-surface-800-200 text-xs tracking-[0.15em] uppercase"
		>
			Difficulty
		</span>
		<div class="flex items-center gap-5" role="group" aria-labelledby="frenzy-difficulty">
			<button
				type="button"
				class="btn-icon preset-tonal-surface"
				onclick={() => difficulty--}
				disabled={roll.locked || difficulty <= FRENZY_DIFFICULTY.min}
				aria-label="Less Difficulty"
			>
				<Minus size={16} />
			</button>
			<span
				class="font-display text-primary-500 w-16 text-center text-5xl leading-none"
				aria-live="polite"
			>
				{difficulty}
			</span>
			<button
				type="button"
				class="btn-icon preset-tonal-surface"
				onclick={() => difficulty++}
				disabled={roll.locked || difficulty >= FRENZY_DIFFICULTY.max}
				aria-label="More Difficulty"
			>
				<Plus size={16} />
			</button>
		</div>
		<span class="text-surface-800-200 text-sm">
			{plural(difficulty, 'success', 'successes')} to resist
		</span>
	</div>

	<!-- The dice: blank faces until rolled (any the penalty removes crossed out), then
	     tumbling, then revealed -->
	<RollingDice
		{faces}
		rolling={roll.rolling}
		stagger={!rerolling}
		removed={result ? 0 : pool.removed}
		label={roll.done && result
			? `Dice: ${result.dice.join(', ')}`
			: `${roll.locked ? 'Rolling ' : ''}${plural(pool.total, 'die', 'dice')}${
					pool.removed > 0 ? `, ${pool.removed} removed by the penalty` : ''
				}`}
	/>

	<!-- The outcome takes the description's place, so the modal keeps its height -->
	{#if roll.done && result}
		<p class="text-sm" role="status">
			{plural(countSuccesses(result.dice), 'success', 'successes')} against Difficulty {difficulty}.
			{#if result.critical}
				Resist frenzy without losing a turn.
			{:else if result.passed}
				You spend 1 turn resisting frenzy.
			{:else}
				You succumb to the Beast.
			{/if}
		</p>
	{:else}
		<p class="text-sm">
			Roll {plural(pool.total, 'die', 'dice')} ({poolParts}){dreaming
				? `, re-rolling up to ${DREAM_REROLLS} failures (The Dream)`
				: ''}.
		</p>
	{/if}

	{#if clanned}
		<div class="space-y-2">
			{#if severity > 0}
				<ToggleCard
					icon={HandFist}
					label="Brujah Fury"
					detail="−{plural(severity, 'die', 'dice')} (Bane Severity), at least 1"
					bind:checked={() => penalty === 'brujah', (on) => setPenalty('brujah', on)}
					disabled={roll.locked}
				/>
			{/if}
			<ToggleCard
				icon={Brain}
				label="Malkavian Terror"
				detail="−2 dice (Compulsion), at least 1"
				bind:checked={() => penalty === 'malkavian', (on) => setPenalty('malkavian', on)}
				disabled={roll.locked}
			/>
		</div>
	{/if}

	<Stepper label="Bonus Dice" bind:value={bonus} max={MAX_FRENZY_BONUS} disabled={roll.locked} />

	<!-- Advantages toggle as chips, any number at once -->
	<div class="space-y-2">
		<div id="frenzy-advantages">Advantages</div>
		<div class="flex flex-wrap gap-2" role="group" aria-labelledby="frenzy-advantages">
			{#each FRENZY_ADVANTAGES as advantage (advantage.value)}
				{@const on = advantages.includes(advantage.value)}
				<button
					type="button"
					class={[
						'chip border transition-colors',
						on
							? 'border-secondary-500 bg-secondary-500/10'
							: 'border-surface-600-400 enabled:hover:bg-surface-300-700/40'
					]}
					aria-pressed={on}
					disabled={roll.locked}
					onclick={() => toggleAdvantage(advantage.value)}
				>
					{advantage.name}
					<span class="text-surface-800-200 text-xs">
						{advantage.dice > 0 ? `+${advantage.dice}` : 're-roll'}
					</span>
				</button>
			{/each}
		</div>
	</div>

	{#if roll.error}
		<p class="text-error-500 text-sm" role="alert">{roll.error}</p>
	{/if}

	<ModalActions bind:open done={roll.done} locked={roll.locked} action="Roll" onaction={doFrenzy} />
</Modal>
