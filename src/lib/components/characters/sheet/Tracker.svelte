<script lang="ts">
	import { capitalize, orList } from '../../..';
	import { untrack } from 'svelte';
	import { Bandage, Droplets, HandFist, HeartPlus } from '@lucide/svelte';
	import { isVampiric } from '$lib/rules/vampire';
	import Popover from '$lib/components/ui/Popover.svelte';

	import { mendAmount } from '$lib/rules/damage';
	import { getConstraints } from '$lib/constraints';
	import { getPoolPicker } from '$lib/state/poolPicker.svelte';
	import type { Character, TrackType } from '$lib/types';

	import MenuAction from './MenuAction.svelte';
	import Stepper from '$lib/components/ui/Stepper.svelte';
	import AggravatedBox from '$lib/components/characters/glyphs/damage/Aggravated.svelte';
	import SuperficialBox from '$lib/components/characters/glyphs/damage/Superficial.svelte';
	import HaleBox from '$lib/components/characters/glyphs/damage/Hale.svelte';
	import TrackBox from '$lib/components/characters/glyphs/damage/TrackBox.svelte';
	import { CLICKABLE } from './clickable';
	import TrackerRow from './TrackerRow.svelte';

	type DamageSymbol = '.' | '/' | 'x';
	type DamageAdjust = { title: string; symbol: DamageSymbol; dec: boolean; inc: boolean };

	interface ComponentProps {
		character: Character;
		track: TrackType;
		editing: boolean;
		actionable?: boolean; // Outside edit mode, clicking the track offers actions (Take Damage, ...)
		onRouse?: () => void; // A ghoul's Health menu offers Rouse, as ghouls pay for it in Health
		onMend?: (type: 'superficial' | 'aggravated', track: TrackType) => void; // The Mend buttons open the Mend modal
		onTakeDamage?: (track: TrackType) => void; // Take Damage opens the damage modal
	}

	let {
		character = $bindable(),
		track,
		editing,
		actionable = false,
		onRouse,
		onMend,
		onTakeDamage
	}: ComponentProps = $props();

	/** Close the menu, and open the Mend modal for a kind of damage. */
	const startMend = (type: 'superficial' | 'aggravated') => {
		showActions = false;
		onMend?.(type, track);
	};

	const offersRouse = $derived(
		onRouse !== undefined && track === 'health' && character.splat === 'ghoul'
	);

	// While a pool is being picked, the track is only to look at (Willpower's row is a choice instead)
	const picker = getPoolPicker();

	let trackLabel = $derived(capitalize(track));
	// The actions menu's hover text: what it offers this viewer
	const actionsTitle = $derived(
		capitalize(
			orList(['take damage', ...(onMend ? ['mend'] : []), ...(offersRouse ? ['Rouse'] : [])])
		)
	);
	let showControls = $state(false);
	let showActions = $state(false);
	// So neither popover reopens by itself when the mode switches back
	$effect(() => {
		if (!editing) showControls = false;
		if (editing || picker?.active) showActions = false;
	});

	// Edits happen on a local copy, which is written back to the character
	let trackArray = $state(untrack(() => [...character[track]])) as DamageSymbol[];
	$effect(() => {
		character[track] = trackArray.join('');
	});

	let damageCounts = $derived.by(() => {
		const counts = { '.': 0, '/': 0, x: 0 };
		trackArray.forEach((c) => counts[c]++);
		return counts;
	});

	// Health and Willpower both take Superficial and Aggravated damage
	let levels: DamageAdjust[] = $derived([
		{
			title: 'Superficial',
			symbol: '/',
			dec: damageCounts['/'] > 0,
			inc: damageCounts['.'] > 0
		},
		{
			title: 'Aggravated',
			symbol: 'x',
			dec: damageCounts['x'] > 0,
			inc: damageCounts['/'] + damageCounts['.'] > 0
		}
	]);

	function adjustTrack(symbol: DamageSymbol, amount: number): void {
		const newCounts = { ...damageCounts };
		newCounts[symbol] = Math.max(0, newCounts[symbol] + amount);

		// Calculate total used slots
		const totalDamage = newCounts['/'] + newCounts['x'];
		const healthyDots = Math.max(0, trackArray.length - totalDamage);
		newCounts['.'] = healthyDots;

		// Rebuild the track with priority: aggravated > superficial > healthy
		trackArray = [
			...Array(newCounts['x']).fill('x'),
			...Array(newCounts['/']).fill('/'),
			...Array(newCounts['.']).fill('.')
		]
			.slice(0, trackArray.length)
			.reverse() as DamageSymbol[];
	}

	// Superficial damage on a full track becomes aggravated, so damage lands until it's all aggravated
	const canTakeDamage = $derived(damageCounts['x'] < trackArray.length);

	// What mending costs or does, for the menu (MendModal explains it in full)
	const isVampire = $derived(isVampiric(character.splat));
	const mendDetail = (type: 'superficial' | 'aggravated'): string => {
		const symbol = type === 'superficial' ? '/' : 'x';
		if (damageCounts[symbol] === 0)
			return `No ${type === 'superficial' ? 'Superficial' : 'Aggravated'} damage`;
		if (track === 'willpower') {
			// A night's rest: the higher of Resolve and Composure
			const recovery = mendAmount(character, type, track);
			return type === 'superficial' ? `Recovers ${recovery}, as a night's rest` : 'Recovers 1';
		}
		if (!isVampire) return 'Heals without Rousing';
		return type === 'superficial' ? 'Costs a Rouse Check' : 'Costs 3 Rouse Checks';
	};

	// Box counts, within the bot's limits (only read by the correction controls)
	const constraints = getConstraints();
	const minBoxes = $derived(constraints().trackers[track].min);
	const maxBoxes = $derived(constraints().trackers[track].max);

	function incBoxes() {
		trackArray.unshift('.');
	}

	function decBoxes() {
		trackArray.shift();
	}
</script>

{#snippet boxes()}
	<div class="flex flex-wrap items-center gap-2">
		{#each [...Array(trackArray.length).keys()].reverse() as index (index)}
			<TrackBox value={trackArray[index]} />
		{/each}
	</div>
{/snippet}

{#snippet controls()}
	<div class="flex w-64 flex-col gap-3">
		<!-- The heading, with the track it corrects under it -->
		<div class="text-center leading-tight">
			<div class="font-display text-md tracking-[0.02em] uppercase">Make Corrections</div>
			<div class="text-surface-200 text-sm">{trackLabel}</div>
		</div>
		<!-- Each kind of damage with the box it draws, as Take Damage's steppers. Setting a count
		     rebuilds the track around it. -->
		<Stepper
			label="Superficial"
			bind:value={() => damageCounts['/'], (next) => adjustTrack('/', next - damageCounts['/'])}
			canAdd={levels[0].inc}
		>
			{#snippet icon()}<SuperficialBox size={20} />{/snippet}
		</Stepper>
		<Stepper
			label="Aggravated"
			bind:value={() => damageCounts['x'], (next) => adjustTrack('x', next - damageCounts['x'])}
			canAdd={levels[1].inc}
		>
			{#snippet icon()}<AggravatedBox size={20} />{/snippet}
		</Stepper>

		<hr class="hr" />
		<Stepper
			label="Boxes"
			bind:value={
				() => trackArray.length, (next) => (next > trackArray.length ? incBoxes() : decBoxes())
			}
			min={minBoxes}
			max={maxBoxes}
		>
			{#snippet icon()}<HaleBox size={20} />{/snippet}
		</Stepper>
		<!-- Corrections aren't logged; damage and mending are, through the actions outside edit mode -->
		<p class="text-surface-200 text-center text-xs">
			These changes won't appear in the Chronicle log. To log damage or mending, exit edit mode
			first.
		</p>
	</div>
{/snippet}

<!-- Damage and mending go through the bot, which logs and reports them. Corrections are in edit
     mode instead. -->
{#snippet actions()}
	<div class="flex w-64 flex-col gap-2">
		<div class="font-display text-md text-center tracking-[0.02em] uppercase">{trackLabel}</div>
		<MenuAction
			icon={HandFist}
			label="Take Damage"
			detail={canTakeDamage ? 'Superficial or Aggravated' : 'Already all Aggravated'}
			badge="error"
			disabled={!canTakeDamage}
			onclick={() => {
				showActions = false;
				onTakeDamage?.(track);
			}}
		/>
		{#if offersRouse}
			<MenuAction
				icon={Droplets}
				label="Rouse"
				detail="Costs 1 Aggravated Health"
				badge="primary"
				onclick={() => {
					showActions = false;
					onRouse?.();
				}}
			/>
		{/if}
		<!-- Health mends as /mend and /aggheal do; Willpower recovers as /awaken does. Only when the
		     viewer may heal (the owner, or a Storyteller for an SPC). -->
		{#if onMend}
			<MenuAction
				icon={Bandage}
				label="Mend Superficial"
				detail={mendDetail('superficial')}
				badge="success"
				disabled={damageCounts['/'] === 0}
				onclick={() => startMend('superficial')}
			/>
			<MenuAction
				icon={HeartPlus}
				label="Mend Aggravated"
				detail={mendDetail('aggravated')}
				badge="success"
				disabled={damageCounts['x'] === 0}
				onclick={() => startMend('aggravated')}
			/>
		{/if}
	</div>
{/snippet}

<!-- Willpower's undamaged boxes are a pool's Willpower; Health isn't rollable -->
<TrackerRow
	label={trackLabel}
	trait={track === 'willpower' ? 'Willpower' : undefined}
	{editing}
	value={boxes}
>
	{#if editing}
		<Popover
			bind:open={showControls}
			trigger={boxes}
			content={controls}
			triggerTitle="Correct {trackLabel}"
			triggerClass={CLICKABLE}
			arrow
		/>
	{:else if actionable && !picker?.active}
		<Popover
			bind:open={showActions}
			trigger={boxes}
			content={actions}
			triggerLabel="{trackLabel} actions"
			triggerTitle={actionsTitle}
			triggerClass={CLICKABLE}
			arrow
		/>
	{:else}
		{@render boxes()}
	{/if}
</TrackerRow>
