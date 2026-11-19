<script lang="ts">
	import { History, Minus, Plus, Sigma } from '@lucide/svelte';
	import { onMount } from 'svelte';

	import { parseApiDate } from '../../..';
	import type { Experience, ExperienceEntry } from '$lib/types';

	interface ComponentProps {
		experience: Experience;
	}

	let { experience }: ComponentProps = $props();

	const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
	const numberFormat = new Intl.NumberFormat('en-US');
	const amountFormat = new Intl.NumberFormat('en-US', { signDisplay: 'always' });

	// Dates are in the viewer's time zone, which the server doesn't know, so the log (grouped by
	// year) only renders in the browser. The tab is selected by the URL hash, which the server
	// never sees, so it's never the one showing when the page is rendered there anyway.
	let mounted = $state(false);
	onMount(() => (mounted = true));

	const unspent = $derived(experience.current ?? 0);
	const lifetime = $derived(experience.total ?? 0);
	const spent = $derived(Math.max(0, lifetime - unspent));
	const spentPercent = $derived(lifetime > 0 ? Math.min(100, (spent / lifetime) * 100) : 0);

	const totals: [string, number][] = $derived([
		['Unspent', unspent],
		['Spent', spent],
		['Lifetime', lifetime]
	]);

	/** Which XP an entry changed, from its event (such as `award_lifetime`). */
	const scope = (entry: ExperienceEntry): string =>
		entry.event.endsWith('_lifetime') ? 'Lifetime XP' : 'Unspent XP';

	interface LogEntry {
		entry: ExperienceEntry;
		date: Date | null; // Null if invalid
	}

	interface YearGroup {
		year: string; // "Unknown" for invalid dates
		entries: LogEntry[];
	}

	/** Group entries by year, keeping their order. */
	const groupByYear = (entries: LogEntry[]): YearGroup[] => {
		const groups: YearGroup[] = [];
		for (const item of entries) {
			const year = item.date ? String(item.date.getFullYear()) : 'Unknown';
			const last = groups.at(-1);
			if (last?.year === year) last.entries.push(item);
			else groups.push({ year, entries: [item] });
		}
		return groups;
	};

	// The log is oldest first; show the latest first
	const years = $derived(
		groupByYear(
			[...(experience.log ?? [])].reverse().map((entry) => {
				const date = parseApiDate(entry.date);
				return { entry, date: Number.isNaN(date.getTime()) ? null : date };
			})
		)
	);
</script>

<div class="grid items-start gap-4 lg:grid-cols-[18rem_1fr]">
	<section class="card space-y-4 p-4 shadow-lg" aria-labelledby="experience-totals">
		<header class="border-surface-300-700 flex items-center gap-2 border-b pb-2">
			<span class="text-primary-500"><Sigma size={18} /></span>
			<h2 class="h6" id="experience-totals">Totals</h2>
		</header>
		<dl class="grid grid-cols-3 gap-2 text-center lg:grid-cols-1 lg:text-left">
			{#each totals as [label, xp] (label)}
				<div class="lg:flex lg:items-baseline lg:justify-between">
					<dt class="text-surface-300 text-sm">{label} XP</dt>
					<dd class="h3 font-semibold tabular-nums">{numberFormat.format(xp)}</dd>
				</div>
			{/each}
		</dl>
		{#if lifetime > 0}
			<div
				class="bg-surface-300-700 h-2 overflow-hidden rounded-full"
				role="img"
				aria-label="{numberFormat.format(spent)} of {numberFormat.format(lifetime)} XP spent"
			>
				<div class="bg-primary-500 h-full rounded-full" style:width="{spentPercent}%"></div>
			</div>
		{/if}
	</section>

	<section class="card space-y-3 p-4 shadow-lg" aria-labelledby="experience-log">
		<header class="border-surface-300-700 flex items-center gap-2 border-b pb-2">
			<span class="text-primary-500"><History size={18} /></span>
			<h2 class="h6" id="experience-log">Log</h2>
		</header>
		{#if years.length === 0}
			<p class="text-surface-300 italic">No experience awards or deductions have been logged.</p>
		{:else if mounted}
			{#each years as group (group.year)}
				<section class="space-y-3" aria-labelledby="experience-{group.year}">
					<h3 class="text-surface-300 text-sm font-semibold" id="experience-{group.year}">
						{group.year}
					</h3>
					<ol class="border-surface-300-700 ml-3 space-y-4 border-l pb-1">
						{#each group.entries as { entry, date }, index (index)}
							{@const award = entry.amount >= 0}
							<li class="relative pl-6">
								<span
									class="ring-surface-50-950 absolute top-1 -left-2.5 flex size-5 items-center justify-center rounded-full text-black ring-4"
									class:bg-success-500={award}
									class:bg-error-500={!award}
									aria-hidden="true"
								>
									{#if award}<Plus size={12} strokeWidth={3} />{:else}<Minus
											size={12}
											strokeWidth={3}
										/>{/if}
								</span>
								<div class="flex items-center justify-between gap-3">
									<div class="min-w-0">
										<p class="break-words">
											{#if entry.reason.trim()}
												{entry.reason}
											{:else}
												<span class="text-surface-300 italic">No reason given</span>
											{/if}
										</p>
										<p class="text-surface-300 text-sm">
											{scope(entry)} ·
											<time datetime={entry.date}
												>{date ? dateFormat.format(date) : 'unknown date'}</time
											>
										</p>
									</div>
									<span
										class="min-w-12 shrink-0 rounded-full px-3 py-1 text-center font-semibold tabular-nums"
										class:preset-tonal-success={award}
										class:preset-tonal-error={!award}
									>
										{amountFormat.format(entry.amount)}
									</span>
								</div>
							</li>
						{/each}
					</ol>
				</section>
			{/each}
		{/if}
	</section>
</div>
