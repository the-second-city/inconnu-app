<script lang="ts">
	import { plural } from '../../..';
	import { untrack } from 'svelte';
	import { Droplets, Flame, Ghost, HandFist, RefreshCcw } from '@lucide/svelte';

	import { bloodPotency } from '$lib/rules/vampire';
	import { atLeast, wait } from '$lib/state/busy';
	import { rouse } from '$lib/api/characterActions';
	import { hungerRiseChance, percent } from '$lib/rules/rouse';
	import type { Character, RouseResult } from '$lib/types';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ModalActions from '$lib/components/ui/ModalActions.svelte';
	import ChoiceRow from '$lib/components/ui/ChoiceRow.svelte';
	import CountdownRing from './CountdownRing.svelte';
	import RollingDice from './RollingDice.svelte';
	import ToggleCard from '$lib/components/ui/ToggleCard.svelte';
	import DiceHandoff from './DiceHandoff.svelte';
	import HungerMeter from './HungerMeter.svelte';
	import Warning from '$lib/components/ui/Warning.svelte';
	import HumanityBlock from './HumanityBlock.svelte';

	interface ComponentProps {
		open: boolean;
		character: Character;
		stepDelay?: number; // ms the dice tumble at least (a ghoul's countdown step)
		revealDelay?: number; // ms each revealed face lingers before the next
		handoffDelay?: number; // ms the revealed dice show before crossfading to Hunger
	}

	let {
		open = $bindable(),
		character,
		stepDelay = 750,
		revealDelay = 650,
		handoffDelay = 1000
	}: ComponentProps = $props();

	const isGhoul = $derived(character.splat === 'ghoul');
	const potency = $derived(bloodPotency(character));
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
	let remaining = $state(0); // A ghoul's countdown while rolling

	// A vampire's dice, rolled in place, in the order rolled: blank faces tumble while the request
	// runs, then each check reveals in turn. A re-rolled check shows its first face, lingers, tumbles
	// again, and shows the second. With Oblivion Stains, a final 1 or 10 is red (it Stains).
	let faces: (number | null)[] = $state([]);
	let stained: boolean[] = $state([]);
	let revealing = $state(false); // Past the first tumble: re-rolls tumble at once
	let staining = $state(false); // This roll applies Oblivion Stains, so Humanity shows with the dice
	let showHunger = $state(false); // The dice have given way to the Hunger they left

	let error: string | null = $state(null);
	let result: RouseResult | null = $state(null);
	let hungerBefore = $state(0);
	let stainsBefore = $state(0);

	// The character with the Rouse's Stains, for the Humanity tracker: each red die's Stain as it's
	// revealed, then the bot's count. (The character itself only updates once it's refetched.) The
	// bot caps Stains at 10.
	const afterRouse: Character = $derived.by(() => ({
		...character,
		stains: Math.min(10, stainsBefore + (result?.stains ?? stained.filter(Boolean).length))
	}));

	const hunger = $derived(character.hunger ?? 0);
	// One choice per number of checks, each with the chance Hunger rises, and the Hunger it could
	// reach (every check failing). As the bot rules it, a Rouse at Hunger 5 calls for a frenzy test,
	// pass or fail, and one below 5 never does.
	const choices = $derived(
		[1, 2, 3].map((checks) => {
			const chance = percent(hungerRiseChance(checks, canReroll && reroll));
			const frenzy = hunger >= 5;
			return {
				checks,
				worst: Math.min(5, hunger + checks),
				frenzy,
				detail: frenzy
					? `Calls for a frenzy test; ${chance} chance a check fails`
					: `${chance} chance Hunger rises`
			};
		})
	);

	// The number of checks whose row is hovered, previewed on the current Hunger
	let previewing: number | null = $state(null);
	const previewHunger = $derived(Math.min(5, hunger + (previewing ?? 0)));

	/** Back to the options, as when the modal opens. */
	const reset = () => {
		result = null;
		error = null;
		previewing = null;
		showHunger = false;
	};

	// Each opening starts at the options (the parent opens it by setting `open`)
	$effect(() => {
		if (open) untrack(reset);
	});

	/**
	 * Roll. A vampire's dice tumble for at least `stepDelay` while the request runs, then reveal one
	 * check at a time, and the result shows; a moment later the dice give way to the Hunger they left.
	 * A ghoul counts down one step instead. On an error, the options come back, saying why.
	 */
	const doRouse = async (checks = 1) => {
		if (rolling) return;
		count = checks;
		rolling = true;
		error = null;
		showHunger = false;
		hungerBefore = character.hunger ?? 0;
		stainsBefore = character.stains ?? 0;
		staining = hasOblivion && oblivion;
		const request = rouse(character._id, {
			count,
			reroll: canReroll && reroll,
			oblivion_stains: staining
		});

		if (isGhoul) {
			remaining = 1;
		} else {
			faces = Array(count).fill(null);
			stained = Array(count).fill(false);
			revealing = false;
		}
		const outcome = await atLeast(request, stepDelay);
		remaining = 0;
		if (outcome.error !== undefined) {
			rolling = false;
			error = outcome.error;
			return;
		}

		if (!isGhoul) {
			const rolled = outcome.result.dice ?? [];
			// The server's Stain faces (1 and 10, unless its settings say otherwise)
			const oblivionFaces = outcome.result.oblivion_faces;
			faces = Array(rolled.length).fill(null);
			stained = Array(rolled.length).fill(false);
			revealing = true;
			for (const [i, check] of rolled.entries()) {
				for (const [roll, face] of check.entries()) {
					if (roll > 0) {
						// The re-roll: tumble again before the second face
						faces[i] = null;
						await wait(revealDelay / 2);
					}
					faces[i] = face;
					// Only a check's final face counts, so only it can Stain
					stained[i] = staining && roll === check.length - 1 && oblivionFaces.includes(face);
					await wait(revealDelay);
				}
			}
		}
		rolling = false;
		result = outcome.result;

		// After a moment with the dice, they crossfade to the Hunger they left
		if (!isGhoul) {
			const shown = result;
			await wait(handoffDelay);
			if (result === shown) showHunger = true;
		}
	};

	/** The dice for screen readers: "3, then 8; 9". */
	const diceLabel = (dice: number[][]): string =>
		dice.map((check) => check.join(', then ')).join('; ');
</script>

<Modal bind:open closeOnEscape={!rolling}>
	<!-- A vampire's result is titled with its outcome: any failure raises Hunger (or, at Hunger 5,
	     risks frenzy) -->
	{#snippet title()}
		{#if result && !isGhoul}
			{result.failures > 0 ? 'Hunger Increase' : 'Success'}
		{:else}
			Rouse Check
		{/if}
	{/snippet}

	<!-- A vampire's dice, from the roll through the result (one element, so the revealed faces
	     don't pop in again), then, a moment after, the Hunger they left in the same place -->
	{#if !isGhoul && (rolling || result)}
		<DiceHandoff show={showHunger} before={hungerBefore} after={result?.hunger ?? hungerBefore}>
			<RollingDice
				{faces}
				rolling
				{stained}
				stagger={!revealing}
				label={result
					? `Rouse dice: ${diceLabel(result.dice ?? [])}`
					: `Rolling ${plural(count, 'Rouse die', 'Rouse dice')}`}
			/>
		</DiceHandoff>
	{/if}

	<!-- With Oblivion Stains, Humanity shows under the dice through the roll, each red die's Stain
	     landing as it's revealed, then how many applied -->
	{#if !isGhoul && staining && (rolling || result)}
		<HumanityBlock character={afterRouse}>
			{#if result}
				<p class="text-sm" role="status">
					{result.stains > 0
						? `${plural(result.stains, 'Oblivion Stain', 'Oblivion Stains')} applied.`
						: 'No Oblivion Stains.'}
				</p>
			{/if}
		</HumanityBlock>
	{/if}

	{#if rolling}
		{#if isGhoul}<CountdownRing {remaining} {stepDelay} />{/if}
	{:else if result === null}
		<!-- Options -->
		{#if isGhoul}
			<!-- Ghouls don't roll: one row, saying what it costs -->
			<ChoiceRow
				icon={HandFist}
				label="Rouse"
				detail="Ghouls don't roll: Rousing deals 1 Aggravated Health damage."
				badge="error"
				tone="error"
				onclick={() => doRouse(1)}
			/>
		{:else}
			<!-- The Hunger there is now. A hovered choice's possible Hunger shows faintly. -->
			<HungerMeter
				{hunger}
				to={previewHunger}
				size={28}
				label="Current Hunger {hunger}"
				class="flex justify-center gap-2"
			/>

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
							detail="For Oblivion: Stain faces (usually 1 or 10) Stain"
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
					<!-- The Hunger it could reach trails, the possible rise faint -->
					<ChoiceRow
						icon={choice.frenzy ? Flame : Droplets}
						label={plural(choice.checks, 'Check', 'Checks')}
						name="Rouse {plural(choice.checks, 'Check', 'Checks')}"
						detail={choice.detail}
						badge={choice.frenzy ? 'warning' : 'primary'}
						tone={choice.frenzy ? 'warning' : 'surface'}
						outline={choice.frenzy ? 'warning' : 'surface'}
						onclick={() => doRouse(choice.checks)}
						onpointerenter={() => (previewing = choice.checks)}
					>
						{#snippet trailing()}<HungerMeter {hunger} to={choice.worst} />{/snippet}
					</ChoiceRow>
				{/each}
			</div>
		{/if}

		{#if error}
			<p class="text-error-500 text-sm" role="alert">{error}</p>
		{/if}

		<ModalActions bind:open />
	{:else}
		<!-- Result -->
		<div class="space-y-3" role="status">
			{#if isGhoul}
				<p>{character.name} took 1 Aggravated Health damage.</p>
			{:else}
				<p class="sr-only">Hunger {hungerBefore} → {result.hunger}</p>
				{#if result.frenzy}
					<Warning icon={Flame}>
						{#if result.failures > 0}
							A check failed at Hunger 5: test for Hunger frenzy (or torpor, if awakening).
						{:else}
							Passed at Hunger 5, but test for Hunger frenzy.
						{/if}
					</Warning>
				{/if}

				{#if result.degeneration > 0}
					<p>Degeneration: {result.degeneration} Aggravated Willpower damage.</p>
				{/if}
			{/if}
		</div>

		<ModalActions bind:open done>
			<button type="button" class="btn preset-tonal-surface" onclick={reset}>Rouse Again</button>
		</ModalActions>
	{/if}
</Modal>
