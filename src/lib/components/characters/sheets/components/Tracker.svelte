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
	}

	let { character = $bindable(), track, editing }: ComponentProps = $props();

	let trackLabel = $derived(track.charAt(0).toUpperCase() + track.slice(1));
	let showControls = $state(false);
	// So the controls don't reopen by themselves when editing starts again
	$effect(() => {
		if (!editing) showControls = false;
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
		<div class="text-md text-center uppercase">{trackLabel}</div>
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
				disabled={trackArray.length == 1}
				aria-label="Decrease Boxes"
			>
				-
			</button>
			Boxes
			<button
				class="btn preset-tonal-surface"
				onclick={incBoxes}
				disabled={trackArray.length == 15}
				aria-label="Increase Boxes"
			>
				+
			</button>
		</div>
	</div>
{/snippet}

{#if editing}
	<Popover bind:open={showControls} trigger={boxes} content={controls} arrow />
{:else}
	{@render boxes()}
{/if}
