<script lang="ts">
	import { untrack } from 'svelte';
	import { Bandage, Droplets, HandFist, HeartPlus } from '@lucide/svelte';
	import { isVampiric } from '$lib/vampire';
	import Popover from '$lib/components/Popover.svelte';

	import { mendAmount, TRACK_LIMITS } from '$lib/damage';
	import type { Character, TrackType } from '$lib/types';

	import MenuAction from './MenuAction.svelte';
	import Stepper from '$lib/components/characters/Stepper.svelte';
	import AggravatedBox from './damage/Aggravated.svelte';
	import SuperficialBox from './damage/Superficial.svelte';
	import HaleBox from './damage/Hale.svelte';
	import TrackBox from './damage/TrackBox.svelte';
	import { CLICKABLE } from './clickable';

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

	let trackLabel = $derived(track.charAt(0).toUpperCase() + track.slice(1));
	let showControls = $state(false);
	let showActions = $state(false);
	// So neither popover reopens by itself when the mode switches back
	$effect(() => {
		if (!editing) showControls = false;
		if (editing) showActions = false;
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

	// Box counts, within the bot's limits
	const minBoxes = $derived(TRACK_LIMITS[track].min);
	const maxBoxes = $derived(TRACK_LIMITS[track].max);

	function incBoxes() {
		trackArray.unshift('.');
	}

	function decBoxes() {
		trackArray.shift();
	}
</script>

{trackLabel}

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
			<div class="text-md uppercase">Make Corrections</div>
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
		<div class="text-md text-center uppercase">{trackLabel}</div>
		<MenuAction
			icon={HandFist}
			label="Take Damage"
			detail={canTakeDamage ? 'Superficial or Aggravated' : 'Already all Aggravated'}
			tone="error"
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
				tone="primary"
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
				tone="success"
				disabled={damageCounts['/'] === 0}
				onclick={() => startMend('superficial')}
			/>
			<MenuAction
				icon={HeartPlus}
				label="Mend Aggravated"
				detail={mendDetail('aggravated')}
				tone="success"
				disabled={damageCounts['x'] === 0}
				onclick={() => startMend('aggravated')}
			/>
		{/if}
	</div>
{/snippet}

{#if editing}
	<Popover
		bind:open={showControls}
		trigger={boxes}
		content={controls}
		triggerClass={CLICKABLE}
		arrow
	/>
{:else if actionable}
	<Popover
		bind:open={showActions}
		trigger={boxes}
		content={actions}
		triggerLabel="{trackLabel} actions"
		triggerClass={CLICKABLE}
		arrow
	/>
{:else}
	{@render boxes()}
{/if}
