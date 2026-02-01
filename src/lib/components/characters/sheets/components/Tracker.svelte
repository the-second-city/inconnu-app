<script lang="ts">
	import { Popover } from '@skeletonlabs/skeleton-svelte';

	import type { Character, TrackType } from '$lib/types';

	import TrackBox from './damage/TrackBox.svelte';

	type DamageSymbol = '.' | '/' | 'x' | '*';
	type DamageAdjust = { title: string; symbol: DamageSymbol; dec: boolean; inc: boolean };
	type ControlState = {
		bashing: { dec: boolean; inc: boolean };
		lethal: { dec: boolean; inc: boolean };
		aggravated: { dec: boolean; inc: boolean };
	};

	interface ComponentProps {
		character: Character;
		track: TrackType;
		editing: boolean;
	}

	let { character = $bindable(), track, editing }: ComponentProps = $props();

	let trackLabel = $derived(track.charAt(0).toUpperCase() + track.slice(1));
	let showControls = $state(false);

	let trackArray = $state([...character[track]]) as DamageSymbol[];
	$effect(() => {
		character[track] = trackArray.join('');
	});

	let damageCounts = $derived.by(() => {
		const counts = { '.': 0, '/': 0, x: 0, '*': 0 };
		trackArray.forEach((c) => counts[c]++);
		return counts;
	});
	let trackState = $derived.by(() => {
		return {
			hale: damageCounts['.'],
			bashing: damageCounts['/'],
			lethal: damageCounts['x'],
			aggravated: damageCounts['*']
		};
	});
	let controls: ControlState = $derived({
		bashing: {
			dec: trackState.bashing > 0,
			inc: trackState.hale > 0
		},
		lethal: {
			dec: trackState.lethal > 0,
			inc: trackState.bashing + trackState.hale > 0
		},
		aggravated: {
			dec: trackState.aggravated > 0,
			inc: trackState.lethal + trackState.bashing + trackState.hale > 0
		}
	});

	let levels: DamageAdjust[] = $derived.by(() => {
		if (track === 'health') {
			return [
				{
					title: 'Bashing',
					symbol: '/',
					dec: controls.bashing.dec,
					inc: controls.bashing.inc
				},
				{
					title: 'Lethal',
					symbol: 'x',
					dec: controls.lethal.dec,
					inc: controls.lethal.inc
				},
				{
					title: 'Aggravated',
					symbol: '*',
					dec: controls.aggravated.dec,
					inc: controls.aggravated.inc
				}
			];
		}
		return [
			{
				title: 'Temporary',
				symbol: '/',
				dec: controls.bashing.dec,
				inc: controls.bashing.inc
			}
		];
	});

	function adjustTrack(symbol: DamageSymbol, amount: number): void {
		const newCounts = { ...damageCounts };
		newCounts[symbol] = Math.max(0, newCounts[symbol] + amount);

		// Calculate total used slots
		const totalDamage = newCounts['/'] + newCounts['x'] + newCounts['*'];
		const healthyDots = Math.max(0, trackArray.length - totalDamage);
		newCounts['.'] = healthyDots;

		// Rebuild the track with priority: aggravated > lethal > bashing > healthy
		trackArray = [
			...Array(newCounts['*']).fill('*'),
			...Array(newCounts['x']).fill('x'),
			...Array(newCounts['/']).fill('/'),
			...Array(newCounts['.']).fill('.')
		]
			.slice(0, trackArray.length)
			.reverse() as DamageSymbol[];
	}

	function incPermanent() {
		trackArray.unshift('.');
	}

	function decPermanent() {
		trackArray.shift();
	}
</script>

{trackLabel}

<Popover
	open={showControls}
	onOpenChange={(e) => (showControls = e.open)}
	contentBase="card bg-surface-500 p-4"
	arrow
	arrowBackground="!bg-surface-500 dark:!bg-surface-500"
>
	{#snippet trigger()}
		<div class="flex flex-wrap items-center gap-2">
			{#each [...Array(trackArray.length).keys()].reverse() as index}
				<TrackBox value={trackArray[index]} />
			{/each}
		</div>
	{/snippet}
	{#snippet content()}
		{#if !editing}
			<p>Click "Edit" above to enable controls.</p>
		{:else}
			<div class="flex flex-col gap-2">
				<div class="text-md text-center uppercase">{trackLabel}</div>
				{#each levels as level}
					<div class="flex items-center justify-between gap-3">
						<button
							class="btn preset-tonal-surface"
							disabled={!level.dec}
							onclick={() => adjustTrack(level.symbol, -1)}
						>
							-
						</button>
						{level.title}
						<button
							class="btn preset-tonal-surface"
							disabled={!level.inc}
							onclick={() => adjustTrack(level.symbol, 1)}
						>
							+
						</button>
					</div>
				{/each}

				<hr class="hr" />
				<div class="flex items-center justify-between gap-3">
					<button
						class="btn preset-tonal-surface"
						onclick={decPermanent}
						disabled={trackArray.length == 1}
					>
						-
					</button>
					Permanent
					<button
						class="btn preset-tonal-surface"
						onclick={incPermanent}
						disabled={trackArray.length == 15}
					>
						+
					</button>
				</div>
			</div>
		{/if}
	{/snippet}
</Popover>
