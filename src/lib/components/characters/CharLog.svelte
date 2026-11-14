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
	import type { Component } from 'svelte';

	import Popover from '$lib/components/Popover.svelte';
	import type { CharacterLog, CharacterLogCounter, Splat } from '$lib/types';

	interface ComponentProps {
		log: CharacterLog;
		splat: Splat;
	}

	let { log, splat }: ComponentProps = $props();

	interface StatGroup {
		title: string;
		icon: Component;
		vampiric: boolean; // Hidden for mortals and ghouls unless something was counted
		stats: [CharacterLogCounter, string][];
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
			title: 'Damage Taken',
			icon: HeartCrack,
			vampiric: false,
			stats: [
				['health_superficial', 'Superficial Health'],
				['health_aggravated', 'Aggravated Health'],
				['willpower_superficial', 'Superficial Willpower'],
				['willpower_aggravated', 'Aggravated Willpower']
			]
		}
	];

	/** Parse an API date. The database stores naive UTC, so a date without an offset is UTC. */
	const parseDate = (date: string): Date =>
		new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(date) ? date : `${date}Z`);

	/** Format an API date as a calendar date, such as "Nov 14, 2026". */
	const formatDate = (date: string): string =>
		new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(
			parseDate(date)
		);

	const numberFormat = new Intl.NumberFormat('en-US');

	const isVampire = $derived(splat === 'vampire' || splat === 'thin-blood');

	const groups = $derived(
		GROUPS.filter(
			(group) => isVampire || !group.vampiric || group.stats.some(([key]) => log[key] > 0)
		)
	);
</script>

<div class="space-y-4">
	<p class="text-surface-300 flex flex-wrap items-center gap-x-2">
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
			<section
				class="card variant-soft mb-4 break-inside-avoid space-y-2 p-4 shadow-lg"
				aria-labelledby={id}
			>
				<header class="border-surface-300-600 flex items-center gap-2 border-b pb-2">
					<span class="text-primary-500"><group.icon size={18} /></span>
					<h2 class="h6" {id}>{group.title}</h2>
				</header>
				<dl class="space-y-1">
					{#each group.stats as [key, label] (key)}
						<!-- Counters that started after the character was created explain why they're low -->
						{@const since = log.incomplete_since?.[key]}
						<div class="flex justify-between gap-4">
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
							<dd class="font-semibold tabular-nums">{numberFormat.format(log[key] ?? 0)}</dd>
						</div>
					{/each}
				</dl>
			</section>
		{/each}
	</div>
</div>
