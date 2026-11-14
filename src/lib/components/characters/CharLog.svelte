<script lang="ts">
	import {
		CalendarDays,
		Crosshair,
		Droplet,
		Flame,
		HeartCrack,
		Info,
		Moon,
		Scale
	} from '@lucide/svelte';
	import { onMount, type Component } from 'svelte';

	import Popover from '$lib/components/Popover.svelte';
	import TrackBox from '$lib/components/characters/sheets/components/damage/TrackBox.svelte';
	import type {
		CharacterLog,
		CharacterLogCounter,
		CharacterLogStat,
		CharacterLogTrack,
		Splat
	} from '$lib/types';

	interface ComponentProps {
		log: CharacterLog;
		splat: Splat;
	}

	let { log, splat }: ComponentProps = $props();

	interface StatGroup {
		title: string;
		icon: Component;
		vampiric: boolean; // Hidden for mortals and ghouls unless something was counted
		stats: [CharacterLogStat, string][];
	}

	const GROUPS: StatGroup[] = [
		{
			title: 'Blood',
			icon: Droplet,
			vampiric: true,
			stats: [
				['rouse_checks', 'Rouse checks'],
				['rouse_successes', 'Rouse successes'],
				['rouse_failures', 'Rouse failures'],
				['surges', 'Blood Surges']
			]
		},
		{
			title: 'Hunger',
			icon: Crosshair,
			vampiric: true,
			stats: [
				['hunger_gained', 'Hunger gained'],
				['hunger_slaked', 'Total Hunger slaked'],
				['times_slaked', 'Times slaked'],
				['hunts', 'Hunts']
			]
		},
		{
			title: 'Nights',
			icon: Moon,
			vampiric: true,
			stats: [
				['times_awakened', 'Nights awakened'],
				['times_blushed', 'Blushes of Life']
			]
		},
		{
			title: 'Frenzy',
			icon: Flame,
			vampiric: true,
			stats: [
				['times_frenzied', 'Frenzies'],
				['frenzy_resisted', 'Frenzies resisted']
			]
		},
		{
			title: 'Humanity',
			icon: Scale,
			vampiric: false,
			stats: [
				['stains_gained', 'Stains gained'],
				['remorse_checks', 'Remorse checks'],
				['remorse_successes', 'Remorse successes'],
				['remorse_failures', 'Remorse failures'],
				['degenerations', 'Degenerations'],
				['deepest_degeneration', 'Deepest degeneration']
			]
		},
		{
			title: 'Damage',
			icon: HeartCrack,
			vampiric: false,
			stats: [
				['worst_health', 'Worst Health'],
				['worst_willpower', 'Worst Willpower'],
				['health_superficial', 'Superficial Health'],
				['health_aggravated', 'Aggravated Health'],
				['willpower_superficial', 'Superficial Willpower'],
				['willpower_aggravated', 'Aggravated Willpower'],
				['times_impaired', 'Times impaired'],
				['times_mended', 'Times mended']
			]
		}
	];

	const dateFormat = new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
	const numberFormat = new Intl.NumberFormat('en-US');

	// Dates are in the viewer's time zone, which the server doesn't know, so they're only
	// formatted in the browser. Otherwise the page would keep the server's calendar day.
	let mounted = $state(false);
	onMount(() => (mounted = true));

	/** Parse an API date. The database stores naive UTC, so a date-time without an offset is UTC. */
	const parseDate = (date: string): Date => new Date(/T[^Z+-]*$/.test(date) ? `${date}Z` : date);

	/** Format an API date as a calendar date, such as "Nov 14, 2026", or "unknown" if invalid.
	 * It's empty until the page is in the browser. */
	const formatDate = (date: string): string => {
		if (!mounted) return '';
		const parsed = parseDate(date);
		return Number.isNaN(parsed.getTime()) ? 'unknown' : dateFormat.format(parsed);
	};

	const TRACKS: CharacterLogStat[] = [
		'worst_health',
		'worst_willpower'
	] satisfies CharacterLogTrack[];

	/** Whether a stat is a damage track rather than a count. */
	const isTrack = (key: CharacterLogStat): key is CharacterLogTrack => TRACKS.includes(key);

	/** A damage track's boxes, damage first, as the sheet shows them. */
	const trackBoxes = (track: string): string[] => [...track].reverse();

	/** A damage track described for screen readers, such as "2 Superficial, 1 Aggravated of 7". */
	const describeTrack = (track: string): string => {
		const superficial = [...track].filter((box) => box === '/').length;
		const aggravated = [...track].filter((box) => box === 'x').length;
		return `${superficial} Superficial, ${aggravated} Aggravated of ${track.length}`;
	};

	/** A row's classes. Tracks stack their label over their boxes, and the last of a run of
	 * tracks gets extra room to set it apart from the counts below. */
	const rowClass = (group: StatGroup, index: number): string => {
		const key = group.stats[index][0];
		if (!isTrack(key)) return 'flex justify-between gap-4';
		const next = group.stats[index + 1]?.[0];
		return next && !isTrack(next) ? 'space-y-1 pb-4' : 'space-y-1 pb-1.5';
	};

	/** Whether a stat has counted anything. */
	const hasCount = (key: CharacterLogStat): boolean =>
		isTrack(key) ? (log[key] ?? '').length > 0 : (log[key] ?? 0) > 0;

	const isVampire = $derived(splat === 'vampire' || splat === 'thin-blood');

	const groups = $derived(
		GROUPS.filter(
			(group) => isVampire || !group.vampiric || group.stats.some(([key]) => hasCount(key))
		)
	);
</script>

<div class="space-y-4">
	<!-- Hidden until its dates are formatted in the browser, so it doesn't flash half-empty -->
	<p class="text-surface-300 flex flex-wrap items-center gap-x-2" class:invisible={!mounted}>
		<CalendarDays size={18} class="text-primary-500" aria-hidden="true" />
		<span>Created <time datetime={log.created}>{formatDate(log.created)}</time></span>
		{#if log.left}
			<span aria-hidden="true">·</span>
			<span>Owner left the server <time datetime={log.left}>{formatDate(log.left)}</time></span>
		{/if}
	</p>

	<!-- Columns, not a grid, so each card sits right under the one above it (masonry).
	     The negative margin cancels the bottom margin of each column's last card. -->
	<div class="-mb-4 columns-1 gap-4 sm:columns-2 lg:columns-3">
		{#each groups as group (group.title)}
			{@const id = `log-${group.title.toLowerCase().replace(/\s+/g, '-')}`}
			<section class="card mb-4 break-inside-avoid space-y-2 p-4 shadow-lg" aria-labelledby={id}>
				<header class="border-surface-300-700 flex items-center gap-2 border-b pb-2">
					<span class="text-primary-500"><group.icon size={18} /></span>
					<h2 class="h6" {id}>{group.title}</h2>
				</header>
				<dl class="space-y-1">
					{#each group.stats as [key, label], index (key)}
						<!-- Counters that started after the character was created explain why they're low -->
						{@const since = log.incomplete_since?.[key]}
						<div class={rowClass(group, index)}>
							<dt class="flex items-center gap-1.5">
								{label}
								{#if since}
									<Popover
										arrow
										triggerClass="text-surface-400 hover:text-surface-200 transition-colors"
										triggerLabel="About {label}"
										contentClass="card bg-surface-500 max-w-xs p-3 text-sm"
									>
										{#snippet trigger()}<Info size={14} />{/snippet}
										{#snippet content()}
											Counted since {formatDate(since)}. Earlier events aren't included.
										{/snippet}
									</Popover>
								{/if}
							</dt>
							{#if isTrack(key)}
								{@const track = log[key] ?? ''}
								<dd>
									{#if track}
										<div class="flex flex-wrap gap-1" role="img" aria-label={describeTrack(track)}>
											{#each trackBoxes(track) as box, boxIndex (boxIndex)}
												<TrackBox value={box} />
											{/each}
										</div>
									{:else}
										<span class="text-surface-300 italic">None recorded</span>
									{/if}
								</dd>
							{:else}
								<dd class="font-semibold tabular-nums">
									{numberFormat.format(log[key as CharacterLogCounter] ?? 0)}
								</dd>
							{/if}
						</div>
					{/each}
				</dl>
			</section>
		{/each}
	</div>
</div>
