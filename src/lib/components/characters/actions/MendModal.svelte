<script lang="ts">
	import { untrack } from 'svelte';
	import { Droplets, Flame, HeartPlus, Moon, Tombstone } from '@lucide/svelte';

	import { isVampiric } from '$lib/rules/vampire';
	import { wait } from '$lib/state/busy';
	import { mend } from '$lib/api/characterActions';
	import { countBoxes, healDamage, mendAmount } from '$lib/rules/damage';
	import { isSuccess, successesLast } from '$lib/rules/dice';
	import { hungerRiseChance, percent } from '$lib/rules/rouse';
	import type { Character, MendResult, TrackType } from '$lib/types';
	import { RollInPlace } from '$lib/state/rollInPlace.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ModalActions from '$lib/components/ui/ModalActions.svelte';
	import ChoiceRow from '$lib/components/ui/ChoiceRow.svelte';
	import DamageTrack from './DamageTrack.svelte';
	import DiceHandoff from './DiceHandoff.svelte';
	import HungerMeter from './HungerMeter.svelte';
	import RollingDice from './RollingDice.svelte';
	import Warning from '$lib/components/ui/Warning.svelte';

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
	const roll = new RollInPlace(() => character);

	// The character as the heal began. Its live update arrives while the dice are still revealing,
	// which would change the track and Hunger under them.

	const isWillpower = $derived(track === 'willpower');
	const trackLabel = $derived(isWillpower ? 'Willpower' : 'Health');
	const isVampire = $derived(isVampiric(roll.shown.splat));
	const isAggravated = $derived(type === 'aggravated');
	// Vampires Rouse to heal Health: once to mend, three times for Aggravated. Others, and Willpower,
	// don't.
	const rouses = $derived(isVampire && !isWillpower ? (isAggravated ? 3 : 1) : 0);

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
				roll.reset();
				result = null;
				revealed = 0;
				showHunger = false;
			});
		}
	});

	/**
	 * Heal in place: the Rouse dice tumble for at least `stepDelay` while the request runs (a beat
	 * without them), then reveal one at a time (failures first, then successes), and the outcome
	 * paints in. On an error, the buttons unlock again, saying why.
	 */
	const doMend = async () => {
		const healed = await roll.roll(() => mend(character._id, { type, track }), stepDelay);
		if (!healed) return;
		result = { ...healed, dice: successesLast(healed.dice) };
		revealed = 0;
		while (revealed < result.dice.length) {
			await wait(revealDelay);
			revealed++;
		}
		roll.finish();
		// After a moment with the dice, they crossfade to the Hunger they left
		const shownResult = result;
		if (rouses > 0) {
			await wait(handoffDelay);
			if (result === shownResult) showHunger = true;
		}
	};

	// Once the dice are in, the outcome
	const outcome = $derived(roll.done ? result : null);

	const actionLabel = $derived(
		isWillpower ? (isAggravated ? 'Heal' : 'Recover') : isAggravated ? 'Heal' : 'Mend'
	);
	// The track as the heal would leave it, to mark the damage it takes away, and how much it heals
	const preview = $derived(
		healDamage(
			roll.shown[track],
			type,
			mendAmount(roll.shown, type, isWillpower ? 'willpower' : 'health')
		)
	);
	const healed = $derived(
		countBoxes(outcome?.track ?? preview, '.') - countBoxes(roll.shown[track], '.')
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
	const hunger = $derived(roll.shown.hunger ?? 0);
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
				badge: risky ? ('warning' as const) : failed ? ('primary' as const) : ('success' as const),
				title: rouses === 1 ? '1 Rouse Check' : `${rouses} Rouse Checks`,
				detail: outcome
					? rouseOutcome(outcome)
					: hunger >= 5
						? `${chance} chance of ${risk}`
						: `${chance} chance Hunger rises${risky ? `; may cause ${risk}` : ''}`,
				risky
			};
		}
		const free = { icon: HeartPlus, badge: 'success' as const, risky: false };
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
				: `${roll.shown.splat === 'ghoul' ? 'Ghouls' : 'Mortals'} heal without Rousing`
		};
	});

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

<Modal bind:open {title} closeOnEscape={roll.closable}>
	<!-- The track: as it is, the damage the heal would take away pulsing (the heal frees the
	     boxes next to the healthy ones); then as healed, the freed boxes pulsing -->
	{#if outcome}
		<DamageTrack label={trackLabel} track={outcome.track} before={roll.shown[track]} />
	{:else}
		<DamageTrack label={trackLabel} track={roll.shown[track]} before={preview} markFrom="healthy" />
	{/if}

	{#if rouses > 0}
		<!-- The dice, then, a moment after they're in, the Hunger they left -->
		<DiceHandoff show={showHunger} before={hunger} after={outcome?.hunger ?? hunger}>
			<RollingDice
				{faces}
				rolling={roll.rolling}
				label={outcome
					? `Rouse dice: ${outcome.dice.join(', ')}`
					: `${roll.locked ? 'Rolling ' : ''}${rouses === 1 ? '1 Rouse die' : `${rouses} Rouse dice`}`}
			/>
		</DiceHandoff>
	{/if}

	<!-- What it heals and costs; once healed, what it did -->
	<div class="space-y-4" role={outcome ? 'status' : undefined}>
		<p class="text-sm">{healing}</p>

		<!-- The detail holds two lines for the Rouses' outcome, which runs longer than the odds -->
		<ChoiceRow
			icon={cost.icon}
			label={cost.title}
			name="Cost: {cost.title}"
			detail={cost.detail}
			badge={cost.badge}
			tone={cost.risky ? 'warning' : 'surface'}
			outline={cost.risky ? 'warning' : 'surface'}
			detailClass={rouses > 0 ? 'min-h-[2lh]' : undefined}
		>
			{#snippet trailing()}
				{#if rouses > 0}
					{#if outcome}<span class="sr-only">Hunger {hunger} → {outcome.hunger}</span>{/if}
					<HungerMeter {hunger} to={meterHunger} mark={outcome ? 'pulse' : 'preview'} />
				{/if}
			{/snippet}
		</ChoiceRow>

		{#if outcome?.frenzy}
			<Warning icon={Flame}>A Rouse failed at Hunger 5: test for Hunger frenzy.</Warning>
		{/if}
		{#if outcome?.torpor}
			<Warning icon={Tombstone}>Hunger would pass 5: {roll.shown.name} falls into torpor.</Warning>
		{/if}
	</div>

	{#if roll.error}
		<p class="text-error-500 text-sm" role="alert">{roll.error}</p>
	{/if}

	<ModalActions
		bind:open
		done={roll.done}
		locked={roll.locked}
		action={actionLabel}
		onaction={doMend}
	/>
</Modal>
