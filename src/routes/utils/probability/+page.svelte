<script lang="ts">
	import { Info } from '@lucide/svelte';
	import { Popover } from '@skeletonlabs/skeleton-svelte';

	import Card from '$lib/components/Card.svelte';
	import Meta from '$lib/components/Meta.svelte';
	import { FORM_CLASSES } from '$lib/constants/formStyles';
	import {
		calculate,
		MAX_HUNGER,
		MAX_POOL,
		STRATEGIES,
		type Probabilities,
		type Strategy
	} from '$lib/probability';

	// Anything smaller displays as 0.00%, so we hide it, as the bot does
	const DISPLAY_MIN = 0.00005;

	type OutcomeKey = 'critical' | 'success' | 'messy' | 'fail' | 'totalFail' | 'bestial';

	/** A roll outcome, as listed and as a segment of the outcome bar. */
	interface Outcome {
		key: OutcomeKey;
		name: string;
		die: string; // The bot's die emoji
		color: string; // The bar segment's color
		always?: boolean; // Shown even when it can't happen
	}

	// From best to worst
	const OUTCOMES: Outcome[] = [
		{ key: 'critical', name: 'Critical Win', die: 'ln_crit', color: 'bg-green-600' },
		{ key: 'success', name: 'Success', die: 'ln_succ', color: 'bg-green-300', always: true },
		{ key: 'messy', name: 'Messy Critical', die: 'h_crit', color: 'bg-error-400' },
		{ key: 'fail', name: 'Failure', die: 'ln_fail', color: 'bg-surface-400' },
		{ key: 'totalFail', name: 'Total Failure', die: 'h_fail', color: 'bg-error-600', always: true },
		{ key: 'bestial', name: 'Bestial Failure', die: 'h_bestial', color: 'bg-red-600' }
	];

	// Strategies that trade success for fewer messy criticals
	const AVOIDS_MESSY: (Strategy | null)[] = ['avoid_messy', 'risky'];

	// What each strategy does, after the bot's Willpower re-roll guide
	const STRATEGY_HELP: Record<Strategy, string> = {
		reroll_failures: 'Re-roll up to three failing normal dice.',
		maximize_criticals:
			"Re-roll up to three failing normal dice. With fewer than three failures, re-roll successes that aren't tens to make up the difference.",
		avoid_messy:
			'Re-roll tens to try to avoid a messy critical. Only possible with exactly one Hunger ten and no more than three normal tens.',
		risky:
			'Like Avoid Messy Crits, but with fewer than three tens, it re-rolls failures too, so it needs at least one failure. Use it if losing the crit would make you fail the roll.'
	};

	// Extra guidance for strategies that are easy to misuse
	const STRATEGY_NOTES: Partial<Record<Strategy, string>> = {
		maximize_criticals:
			'With three or more failing normal dice, functionally identical to Re-roll Failures. With fewer, runs the risk of reducing your total successes. Use only if a Critical is important, or the Difficulty is greater than your pool.'
	};

	// The outcome under the pointer, in the bar or the list, and the card it's in
	let hovered = $state<{ card: string; key: OutcomeKey } | null>(null);

	let pool = $state<number | null>(5);
	let hunger = $state(1);
	let difficulty = $state<number | null>(3);

	// Restore the last roll, then keep it saved. Storage can be unavailable (e.g.
	// private browsing), in which case the inputs reset on reload.
	const STORAGE_KEY = 'probability-inputs';
	let restored = false;
	$effect(() => {
		if (!restored) {
			restored = true;
			try {
				const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
				if (isWhole(saved.pool, 1, MAX_POOL)) pool = saved.pool;
				if (isWhole(saved.hunger, 0, MAX_HUNGER)) hunger = saved.hunger;
				if (isWhole(saved.difficulty, 0)) difficulty = saved.difficulty;
			} catch {
				// Nothing saved, or no storage
			}
		}
		const inputs = JSON.stringify({ pool, hunger, difficulty });
		try {
			localStorage.setItem(STORAGE_KEY, inputs);
		} catch {
			// No storage
		}
	});

	let error = $derived.by(() => {
		if (!isWhole(pool, 1, MAX_POOL)) {
			return `Pool must be a whole number from 1 to ${MAX_POOL}.`;
		}
		if (!isWhole(difficulty, 0)) {
			return 'Difficulty must be a whole number of 0 or more.';
		}
		return null;
	});

	// The roll without re-rolls first, for comparison, then each Willpower strategy
	const ROLLS: [string, Strategy | null][] = [
		['No Re-roll', null],
		...(Object.entries(STRATEGIES) as [Strategy, string][]).map(
			([strategy, name]): [string, Strategy] => [name, strategy]
		)
	];

	let results = $derived(
		error === null
			? ROLLS.map(([name, strategy]): [string, Strategy | null, Probabilities] => [
					name,
					strategy,
					calculate(pool ?? 1, hunger, difficulty ?? 0, strategy)
				])
			: null
	);

	/** Whether an input's value is a whole number within the given bounds. */
	function isWhole(value: number | null, min: number, max = Infinity): boolean {
		return Number.isInteger(value) && (value ?? min) >= min && (value ?? max) <= max;
	}

	/** The chance of any success, including messy criticals. */
	function successful(probs: Probabilities): number {
		return probs.critical + probs.success + probs.messy;
	}

	/** A difference in probability, in percentage points with a sign. */
	function delta(value: number): string {
		const points = (value * 100).toFixed(2);
		return value > 0 ? `+${points} pts` : `${points} pts`;
	}

	/** Whether the pointer is over the outcome in the card. */
	function isHovered(card: string, key: OutcomeKey): boolean {
		return hovered?.card === card && hovered.key === key;
	}

	/** Each outcome that can happen, with its share of the bar and where its center is. */
	function segments(probs: Probabilities): (Outcome & { value: number; center: number })[] {
		let start = 0;
		return OUTCOMES.map((outcome) => {
			const value = probs[outcome.key];
			const center = start + value / 2;
			start += value;
			return { ...outcome, value, center };
		}).filter(({ value }) => value >= DISPLAY_MIN);
	}

	/** A probability as a percentage with two decimal places. */
	function percent(value: number): string {
		return `${(value * 100).toFixed(2)}%`;
	}
</script>

<Meta
	title="Probability Calculator | Inconnu"
	description="Calculate the exact odds of every outcome of a Vampire: The Masquerade 5th Edition roll."
/>

{#snippet stat(value: string, name: string)}
	<dt class="text-right font-bold tabular-nums">{value}</dt>
	<dd>{name}</dd>
{/snippet}

{#snippet change(value: number, goodWhenLower = false)}
	{@const good = goodWhenLower ? value <= -DISPLAY_MIN : value >= DISPLAY_MIN}
	{@const bad = goodWhenLower ? value >= DISPLAY_MIN : value <= -DISPLAY_MIN}
	<span
		class="text-sm font-semibold tabular-nums {good
			? 'text-success-500'
			: bad
				? 'text-error-500'
				: 'text-surface-600-400'}"
	>
		{delta(value)}<span class="sr-only"> compared to no re-roll</span>
	</span>
{/snippet}

{#snippet outcomes(card: string, list: Outcome[], probs: Probabilities, messyChange: number | null)}
	<dl class="col-span-3 grid grid-cols-subgrid gap-y-1">
		{#each list as { key, name, die, always } (key)}
			{#if always || probs[key] >= DISPLAY_MIN}
				<!-- Hovering a row highlights its bar segment, so the list is the bar's legend -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="col-span-3 -mx-1 grid grid-cols-subgrid items-center rounded px-1 transition-colors {isHovered(
						card,
						key
					)
						? 'bg-surface-500/25'
						: ''}"
					onmouseenter={() => (hovered = { card, key })}
					onmouseleave={() => (hovered = null)}
				>
					<!-- The die emoji the bot uses; decorative, since the name follows -->
					<img src="/images/dice/{die}.png" alt="" class="size-5" />
					<dt class="text-right font-bold tabular-nums">{percent(probs[key])}</dt>
					<dd>
						{name}
						{#if key === 'messy' && messyChange !== null}
							<span class="ml-1">{@render change(messyChange, true)}</span>
						{/if}
					</dd>
				</div>
			{/if}
		{/each}
	</dl>
{/snippet}

{#snippet bar(card: string, probs: Probabilities)}
	{@const shown = segments(probs)}
	{@const active = shown.find(({ key }) => isHovered(card, key))}
	<!-- Decorative: the same figures are listed below -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="bg-surface-800 relative my-3 flex h-2.5 rounded-full"
		aria-hidden="true"
		onmouseleave={() => (hovered = null)}
	>
		{#each shown as { key, color, value } (key)}
			<div
				class="{color} h-full transition-opacity first:rounded-l-full last:rounded-r-full {active &&
				active.key !== key
					? 'opacity-30'
					: ''}"
				style:width="{value * 100}%"
				onmouseenter={() => (hovered = { card, key })}
			></div>
		{/each}
		{#if active}
			<!-- Kept inside the bar at its ends, since the card clips overflow -->
			<div
				class="bg-surface-950 border-surface-500 pointer-events-none absolute top-full mt-2 rounded border px-2 py-0.5 text-sm whitespace-nowrap"
				style:left={active.center < 0.2
					? '0'
					: active.center > 0.8
						? 'auto'
						: `${active.center * 100}%`}
				style:right={active.center > 0.8 ? '0' : 'auto'}
				style:translate={active.center >= 0.2 && active.center <= 0.8 ? '-50%' : '0'}
			>
				{active.name} · <span class="font-bold tabular-nums">{percent(active.value)}</span>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet result(
	name: string,
	strategy: Strategy | null,
	probs: Probabilities,
	baseline: Probabilities | null
)}
	{@const chance = successful(probs)}
	<Card>
		<!-- The button stays inside the heading so Card can trim the heading's top space -->
		<h2 class="h4 flex items-center gap-2">
			{name}
			{#if strategy}
				<Popover
					positioning={{ placement: 'bottom' }}
					triggerBase="text-surface-600-400 hover:text-surface-950-50 transition-colors"
					triggerAriaLabel="About {name}"
					contentBase="card bg-surface-100-900 border-surface-500 max-w-xs border p-3 text-base shadow-xl"
					arrow
					arrowBackground="var(--color-surface-100-900)"
				>
					{#snippet trigger()}
						<Info size={18} />
					{/snippet}
					{#snippet content()}
						<p>{STRATEGY_HELP[strategy]}</p>
						{#if STRATEGY_NOTES[strategy]}
							<p class="text-surface-700-300 mt-2 text-sm">{STRATEGY_NOTES[strategy]}</p>
						{/if}
					{/snippet}
				</Popover>
			{/if}
		</h2>

		<div class="mt-1 flex flex-wrap items-baseline gap-x-3">
			<span class="text-4xl font-bold tabular-nums">{percent(chance)}</span>
			<span class="text-surface-700-300">successful</span>
			{#if baseline}
				<span class="ml-auto">{@render change(chance - successful(baseline))}</span>
			{/if}
		</div>

		{@render bar(name, probs)}

		<dl class="text-surface-700-300 grid grid-cols-[auto_1fr] gap-x-4 text-sm">
			{@render stat(percent(probs.success + probs.critical), 'success without complication')}
			{@render stat(probs.totalSuccesses.toFixed(2), 'average successes')}
			{@render stat(probs.margin.toFixed(2), 'average margin')}
		</dl>
		<hr class="text-surface-300 my-3" />
		<!-- Subgrids keep the columns aligned across both outcome lists -->
		<div class="grid grid-cols-[auto_auto_1fr] gap-x-3">
			{@render outcomes(
				name,
				OUTCOMES.slice(0, 3),
				probs,
				// Avoiding messy criticals is the point of these strategies, so show the change
				baseline && AVOIDS_MESSY.includes(strategy) ? probs.messy - baseline.messy : null
			)}
			<hr class="text-surface-300 col-span-3 my-2" />
			{@render outcomes(name, OUTCOMES.slice(3), probs, null)}
		</div>
	</Card>
{/snippet}

<div class="flex flex-col gap-2">
	<h1 class="h1 font-black">Probability Calculator</h1>

	<p class="mb-4">Find the exact odds of every outcome of a roll, including Willpower re-rolls.</p>

	<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
		<div>
			<label class={FORM_CLASSES.label} for="pool">Pool</label>
			<input
				id="pool"
				type="number"
				min="1"
				max={MAX_POOL}
				bind:value={pool}
				class={FORM_CLASSES.textInput}
				aria-describedby={error ? 'probability-error' : undefined}
			/>
		</div>
		<div>
			<label class={FORM_CLASSES.label} for="hunger">Hunger</label>
			<select id="hunger" bind:value={hunger} class={FORM_CLASSES.selectInput}>
				{#each Array.from({ length: MAX_HUNGER + 1 }, (_, i) => i) as value (value)}
					<option {value}>{value}</option>
				{/each}
			</select>
		</div>
		<div>
			<label class={FORM_CLASSES.label} for="difficulty">Difficulty</label>
			<input
				id="difficulty"
				type="number"
				min="0"
				bind:value={difficulty}
				class={FORM_CLASSES.textInput}
				aria-describedby={error ? 'probability-error' : undefined}
			/>
		</div>
	</div>

	{#if error}
		<p id="probability-error" class={FORM_CLASSES.error} role="alert">{error}</p>
	{/if}

	{#if results}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each results as [name, strategy, probs], i (name)}
				{@render result(name, strategy, probs, i === 0 ? null : results[0][2])}
			{/each}
		</div>
	{/if}
</div>
