<script lang="ts">
	import { untrack } from 'svelte';
	import Popover from '$lib/components/Popover.svelte';

	import type { Character, TrackType } from '$lib/types';

	import TrackBox from './damage/TrackBox.svelte';

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

	// A clickable track is highlighted on hover, like the Hunger drops' Rouse button. The padding is
	// offset by a negative margin, so the boxes don't move.
	const CLICKABLE = 'hover:preset-tonal -mx-2 -my-1 w-fit cursor-pointer rounded-md px-2 py-1';

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

	// Box counts: Health 4-20, Willpower 3-20
	const minBoxes = $derived(track === 'willpower' ? 3 : 4);
	const MAX_BOXES = 20;

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
	<div class="flex flex-col gap-2">
		<div class="text-md text-center uppercase">Make Corrections</div>
		{#each levels as level (level.symbol)}
			<div class="flex items-center justify-between gap-3">
				<button
					class="btn preset-tonal-surface"
					disabled={!level.dec}
					onclick={() => adjustTrack(level.symbol, -1)}
					aria-label="Decrease {level.title}"
				>
					-
				</button>
				{level.title}
				{trackLabel}
				<button
					class="btn preset-tonal-surface"
					disabled={!level.inc}
					onclick={() => adjustTrack(level.symbol, 1)}
					aria-label="Increase {level.title}"
				>
					+
				</button>
			</div>
		{/each}

		<hr class="hr" />
		<div class="flex items-center justify-between gap-3">
			<button
				class="btn preset-tonal-surface"
				onclick={decBoxes}
				disabled={trackArray.length <= minBoxes}
				aria-label="Decrease Boxes"
			>
				-
			</button>
			Boxes
			<button
				class="btn preset-tonal-surface"
				onclick={incBoxes}
				disabled={trackArray.length >= MAX_BOXES}
				aria-label="Increase Boxes"
			>
				+
			</button>
		</div>
		<!-- Corrections aren't logged; damage and mending are, through the actions outside edit mode -->
		<p class="text-surface-200 mt-2 max-w-60 text-center text-xs">
			These changes won't appear in the Chronicle log. To log damage or mending, exit edit mode
			first.
		</p>
	</div>
{/snippet}

<!-- Not wired up yet: these will call the bot, which logs and reports them. Corrections are in
     edit mode instead. -->
{#snippet actions()}
	<div class="flex w-60 flex-col gap-2">
		<div class="text-md text-center uppercase">{trackLabel}</div>
		<button
			type="button"
			class="btn preset-tonal-surface"
			disabled={!canTakeDamage}
			onclick={() => {
				showActions = false;
				onTakeDamage?.(track);
			}}
		>
			Take Damage
		</button>
		{#if offersRouse}
			<button
				type="button"
				class="btn preset-tonal-surface"
				onclick={() => {
					showActions = false;
					onRouse?.();
				}}
			>
				Rouse
			</button>
		{/if}
		<!-- Health mends as /mend and /aggheal do; Willpower recovers as /awaken does. Only when the
		     viewer may heal (the owner, or a Storyteller for an SPC). -->
		{#if onMend}
			<fieldset class="border-surface-400-600 rounded-base mt-2 border px-2 pb-2">
				<legend class="mx-auto px-2 text-sm uppercase">Mend</legend>
				<div class="flex gap-2">
					<button
						type="button"
						class="btn preset-tonal-surface flex-1"
						disabled={damageCounts['/'] === 0}
						onclick={() => startMend('superficial')}
					>
						Superficial
					</button>
					<button
						type="button"
						class="btn preset-tonal-surface flex-1"
						disabled={damageCounts['x'] === 0}
						onclick={() => startMend('aggravated')}
					>
						Aggravated
					</button>
				</div>
			</fieldset>
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
