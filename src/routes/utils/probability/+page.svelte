<script lang="ts">
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

	let pool = $state<number | null>(5);
	let hunger = $state(1);
	let difficulty = $state<number | null>(3);

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
			? ROLLS.map(([name, strategy]): [string, Probabilities] => [
					name,
					calculate(pool ?? 1, hunger, difficulty ?? 0, strategy)
				])
			: null
	);

	/** Whether an input's value is a whole number within the given bounds. */
	function isWhole(value: number | null, min: number, max = Infinity): boolean {
		return Number.isInteger(value) && (value ?? min) >= min && (value ?? max) <= max;
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

{#snippet outcome(name: string, value: number, always = false)}
	{#if always || value >= DISPLAY_MIN}
		{@render stat(percent(value), name)}
	{/if}
{/snippet}

{#snippet result(name: string, probs: Probabilities)}
	<Card>
		<h2 class="h4 mb-2">{name}</h2>
		<!-- Subgrids keep the number column aligned across all three lists -->
		<div class="grid grid-cols-[auto_1fr] gap-x-4">
			<dl class="col-span-2 grid grid-cols-subgrid gap-y-1">
				{@render stat(percent(probs.success + probs.critical), 'success without complication')}
				{@render stat(probs.totalSuccesses.toFixed(2), 'average successes')}
				{@render stat(probs.margin.toFixed(2), 'average margin')}
			</dl>
			<hr class="text-surface-300 col-span-2 my-2" />
			<dl class="col-span-2 grid grid-cols-subgrid gap-y-1">
				{@render outcome('Critical Win', probs.critical)}
				{@render outcome('Success', probs.success, true)}
				{@render outcome('Messy Critical', probs.messy)}
			</dl>
			<hr class="text-surface-300 col-span-2 my-2" />
			<dl class="col-span-2 grid grid-cols-subgrid gap-y-1">
				{@render outcome('Failure', probs.fail)}
				{@render outcome('Total Failure', probs.totalFail, true)}
				{@render outcome('Bestial Failure', probs.bestial)}
			</dl>
		</div>
	</Card>
{/snippet}

<div class="flex flex-col gap-2">
	<h1 class="h1 font-black">Probability Calculator</h1>

	<p class="mb-4">
		Find the exact odds of every outcome of a roll, including Willpower re-rolls. The pool includes
		Hunger dice, just like <code class="code">/vr</code>. The results match the bot's
		<code class="code">/probability</code> command.
	</p>

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
			{#each results as [name, probs] (name)}
				{@render result(name, probs)}
			{/each}
		</div>
	{/if}
</div>
