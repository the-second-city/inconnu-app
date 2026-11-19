<script lang="ts">
	import { plural } from '../../..';
	import { untrack } from 'svelte';
	import { Eclipse } from '@lucide/svelte';

	import { bloodPotency } from '$lib/rules/vampire';
	import { wait } from '$lib/state/busy';
	import { remorse } from '$lib/api/characterActions';
	import { successesLast } from '$lib/rules/dice';
	import { baneSeverity, remorseDice } from '$lib/rules/remorse';
	import type { Character, RemorseResult } from '$lib/types';
	import { RollInPlace } from '$lib/state/rollInPlace.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ModalActions from '$lib/components/ui/ModalActions.svelte';
	import RollingDice from './RollingDice.svelte';
	import ToggleCard from '$lib/components/ui/ToggleCard.svelte';
	import HumanityBlock from './HumanityBlock.svelte';

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
	const roll = new RollInPlace(() => character);

	// The character as the roll began. The test's live update brings the new Humanity (and clears the
	// Stains) while the dice are still revealing, which would change the dice and the text under them.
	const humanity = $derived(roll.shown.humanity ?? 7);
	const stains = $derived(roll.shown.stains ?? 0);

	// The Lasombra alternative Bane rolls Bane Severity fewer dice. Only vampires have a clan Bane
	// (the app doesn't know the clan, so it's up to the player).
	const severity = $derived(
		roll.shown.splat === 'vampire' ? baneSeverity(bloodPotency(roll.shown)) : 0
	);
	let lasombra = $state(false);
	const dice = $derived(
		remorseDice(humanity, stains, { lasombraBane: lasombra && severity > 0 ? severity : null })
	);
	// The dice without the Bane, so the ones it removes can show, crossed out
	const baseDice = $derived(remorseDice(humanity, stains));
	const removed = $derived(baseDice - dice);

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
		...roll.shown,
		humanity: result?.humanity ?? humanity,
		stains: 0
	}));

	// Each opening starts at the options (the parent opens it by setting `open`)
	$effect(() => {
		if (open) {
			untrack(() => {
				roll.reset();
				result = null;
				revealed = 0;
				lasombra = false;
			});
		}
	});

	/**
	 * Roll in place: the dice tumble for at least `stepDelay` while the request runs, then reveal one
	 * at a time (failures first, then successes), and the outcome paints in. On an error, the options
	 * unlock again, saying why.
	 */
	const doRemorse = async () => {
		if (stains === 0) return;
		const rolled = await roll.roll(
			() => remorse(character._id, { min_override: 1, lasombra_alt: lasombra && severity > 0 }),
			stepDelay
		);
		if (!rolled) return;
		// Successes move to the end, so the reveal builds to them
		result = { ...rolled, dice: successesLast(rolled.dice) };
		revealed = 0;
		while (revealed < rolled.dice.length) {
			await wait(revealDelay);
			revealed++;
		}
		roll.finish();
	};
</script>

<Modal bind:open closeOnEscape={roll.closable}>
	<!-- Once the dice are in, titled with the outcome, as /remorse's is -->
	{#snippet title()}
		{#if roll.done && result}
			{result.remorseful ? 'Remorse Success' : 'Remorse Failure'}
		{:else}
			Remorse Test
		{/if}
	{/snippet}

	<!-- Humanity: as it is, then as the test left it -->
	<HumanityBlock character={roll.done ? afterTest : roll.shown} />

	<!-- The dice: blank faces until rolled (any the Lasombra Bane removes crossed out), then
	     tumbling, then revealed -->
	<RollingDice
		{faces}
		rolling={roll.rolling}
		removed={result ? 0 : removed}
		label={roll.done && result
			? `Dice: ${result.dice.join(', ')}`
			: `${roll.locked ? 'Rolling ' : ''}${plural(dice, 'die', 'dice')}${
					removed > 0 ? `, ${removed} removed by the Lasombra Bane` : ''
				}`}
	/>

	<!-- The outcome takes the description's place, in the same size, and the Lasombra card
	     stays (locked), so the modal keeps its height -->
	{#if roll.done && result}
		<p class="text-sm" role="status">
			{#if result.remorseful}
				You keep the Beast at bay. For now. Humanity remains at {result.humanity}.
			{:else}
				The downward spiral continues… Humanity drops from {humanity} to {result.humanity}.
			{/if}
		</p>
	{:else}
		<p class="text-sm">
			Roll {plural(dice, 'die', 'dice')}. Any 6 or higher keeps Humanity at {humanity}; otherwise it
			drops to {Math.max(0, humanity - 1)}. Either way, the Stains clear.
		</p>
	{/if}

	{#if severity > 0}
		<ToggleCard
			icon={Eclipse}
			label="Lasombra alternative Bane"
			detail="{plural(severity, 'die', 'dice')} fewer (Bane Severity), at least 1"
			bind:checked={lasombra}
			disabled={roll.locked}
		/>
	{/if}

	{#if roll.error}
		<p class="text-error-500 text-sm" role="alert">{roll.error}</p>
	{/if}

	<ModalActions
		bind:open
		done={roll.done}
		locked={roll.locked}
		action="Roll"
		onaction={doRemorse}
		disabled={stains === 0}
	/>
</Modal>
