<script lang="ts">
	import { CircleAlert, Crosshair, DropletOff, Droplets, Sparkles, Target } from '@lucide/svelte';
	import type { Component } from 'svelte';

	import { plural } from '$lib';
	import { missingLabel, resolvePool } from '$lib/rules/macros';
	import type { Character, Macro } from '$lib/types';
	import DiceCount from './DiceCount.svelte';
	import PoolText from './PoolText.svelte';

	interface ComponentProps {
		macro: Macro;
		character: Character; // For the pool's current ratings
	}

	let { macro, character }: ComponentProps = $props();

	const pool = $derived(resolvePool(macro.pool, character));
	const missing = $derived(pool.terms.map(missingLabel).filter((label) => label !== null));

	interface Detail {
		icon: Component;
		label: string;
		tone?: string;
	}

	// Only what differs from a plain roll, as `/macro list` shows them
	const details: Detail[] = $derived.by(() => {
		const list: Detail[] = [];
		if (macro.difficulty > 0) list.push({ icon: Target, label: `Difficulty ${macro.difficulty}` });
		if (macro.rouses > 0) {
			const rerolled = macro.reroll_rouses ? ', re-rolled' : '';
			const stains = macro.staining === 'apply' ? ', Stains' : '';
			list.push({
				icon: Droplets,
				label: `${plural(macro.rouses, 'Rouse Check', 'Rouse Checks')}${rerolled}${stains}`,
				tone: 'text-primary-300'
			});
		}
		if (pool.powerBonus > 0) {
			list.push({ icon: Sparkles, label: `Power Bonus +${pool.powerBonus}` });
		}
		if (!macro.hunger) list.push({ icon: DropletOff, label: 'No Hunger' });
		if (macro.hunt) list.push({ icon: Crosshair, label: 'Hunt', tone: 'text-primary-300' });
		return list;
	});
</script>

<!--
@component
One macro: its name, its pool as the character's traits read now (with the dice they add up to),
what it does besides rolling (Difficulty, Rouse Checks, Hunger, hunting), and its comment.
-->
<article class="macro flex min-w-0 flex-col gap-1.5" aria-label={macro.name}>
	<header class="flex items-baseline gap-3">
		<h3 class="font-display min-w-0 flex-1 truncate text-sm tracking-[0.04em]" title={macro.name}>
			{macro.name}
		</h3>
		{#if pool.terms.length > 0}
			<DiceCount dice={pool.dice} class="text-base" />
		{/if}
	</header>

	{#if pool.terms.length > 0}
		<PoolText terms={pool.terms} />
	{/if}

	{#if missing.length > 0}
		<p class="text-error-400 flex items-center gap-1.5 text-sm">
			<CircleAlert size={14} class="shrink-0" />
			Not on the sheet: {missing.join(', ')}
		</p>
	{/if}

	{#if details.length > 0}
		<ul class="text-surface-300 flex flex-wrap gap-x-3 gap-y-1 text-sm">
			{#each details as detail (detail.label)}
				<li class="flex items-center gap-1">
					<detail.icon size={14} class="shrink-0 {detail.tone ?? 'opacity-70'}" />
					{detail.label}
				</li>
			{/each}
		</ul>
	{/if}

	{#if macro.comment}
		<p class="text-surface-300 text-sm italic">{macro.comment}</p>
	{/if}
</article>
