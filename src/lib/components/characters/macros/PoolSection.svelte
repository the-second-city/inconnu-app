<script lang="ts">
	import { getConstraints } from '$lib/constraints';
	import { Minimize2 } from '@lucide/svelte';

	import { orList, plural } from '$lib';
	import { missingLabel, type ResolvedPool } from '$lib/rules/macros';
	import type { PoolPicker } from '$lib/state/poolPicker.svelte';
	import type { Trait } from '$lib/types';
	import Stepper from '$lib/components/ui/Stepper.svelte';
	import DiceCount from './DiceCount.svelte';
	import PoolChips from './PoolChips.svelte';
	import {
		modifierLimit,
		poolSizeError,
		POOL_HINT,
		missingTraits,
		modifierDetail,
		modifierMin,
		repeatNote
	} from './pool';

	interface ComponentProps {
		picker: PoolPicker;
		traits: Trait[]; // The character's, for the pool's order
		resolved: ResolvedPool; // The pool, read against the character's traits
		onpick: () => void; // Pick traits: collapse the form to its strip
	}

	let { picker, traits, resolved, onpick }: ComponentProps = $props();

	const id = $props.id();
	const empty = $derived(picker.picks.length === 0);
	// Picks the character lacks (from an edited macro), which the bot won't save: the traits, to mark
	// their chips, and what each lacks, to say so ("Occult (Bahari)" when it's the specialty)
	const missing = $derived(missingTraits(resolved.terms));
	const missingLabels = $derived(
		resolved.terms.map(missingLabel).filter((label) => label !== null)
	);
	// All subtracted (say, its last added trait removed), it can't roll
	const addsNothing = $derived(!empty && !picker.adds);

	// The modifier's range, within the bot's limits
	const constraints = getConstraints();
	const limit = $derived(modifierLimit(constraints()));
	// Past the bot's limits on a pool's size
	const sizeError = $derived(poolSizeError(picker.tokens(traits), picker.modifier, constraints()));
</script>

<!--
@component
A macro form's Pool: its dice, Pick traits (which collapses the form to its strip), the chips (or a
hint to click traits on the sheet), what keeps it from saving (traits the character lacks, or
nothing to add), what saving does about repeated traits, and the modifier.
-->
<section class="border-surface-500 flex flex-col gap-2 border-y py-3" aria-labelledby="{id}-pool">
	<div class="flex items-center justify-between">
		<div class="flex items-baseline gap-2">
			<h3 id="{id}-pool" class="font-display text-sm tracking-[0.04em] uppercase">Pool</h3>
			{#if !empty}<DiceCount dice={resolved.dice} />{/if}
		</div>
		<button type="button" class="btn btn-sm hover:preset-tonal-surface" onclick={onpick}>
			<Minimize2 size={14} />
			<span>Pick traits</span>
		</button>
	</div>
	{#if empty}
		<p class="text-surface-300 italic">{POOL_HINT}</p>
	{:else}
		<PoolChips {picker} {traits} {missing} />
	{/if}
	{#if resolved.powerBonus > 0}
		<p class="text-surface-300 text-sm">
			Includes a power bonus of {plural(resolved.powerBonus, 'die', 'dice')}, for using a
			Discipline.
		</p>
	{/if}
	{#if missingLabels.length > 0}
		<p class="text-warning-300 text-sm">
			{orList(missingLabels)}
			{missingLabels.length === 1 ? 'isn’t' : 'aren’t'} on the sheet. Remove {missingLabels.length ===
			1
				? 'it'
				: 'them'} to save.
		</p>
	{/if}
	{#if sizeError}
		<p class="text-warning-300 text-sm">{sizeError}</p>
	{/if}
	{#each picker.repeats as repeat (repeat.trait)}
		<p class="text-warning-300 text-sm">{repeatNote(repeat)}</p>
	{/each}
	{#if addsNothing}
		<p class="text-warning-300 text-sm">A pool needs something to add.</p>
	{/if}
	<Stepper
		label="Modifier"
		bind:value={() => picker.modifier, (value) => (picker.modifier = value)}
		min={modifierMin(picker, limit)}
		max={limit}
		detail={modifierDetail(picker.modifier)}
	/>
</section>
