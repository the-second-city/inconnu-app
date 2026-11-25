<script lang="ts">
	import { ArrowRight, X } from '@lucide/svelte';

	import type { PoolPicker } from '$lib/state/poolPicker.svelte';
	import { isNumber } from '$lib/state/poolPicker.svelte';
	import type { ResolvedPool } from '$lib/rules/macros';
	import type { Trait } from '$lib/types';
	import Stepper from '$lib/components/ui/Stepper.svelte';
	import DiceCount from './DiceCount.svelte';
	import PoolChips from './PoolChips.svelte';
	import {
		MODIFIER_LIMIT,
		POOL_HINT,
		formatModifier,
		missingTraits,
		modifierDetail,
		modifierMin
	} from './pool';

	interface ComponentProps {
		picker: PoolPicker;
		traits: Trait[]; // The character's, for the pool's order
		title: string; // The macro's name, or "New Macro"
		resolved: ResolvedPool; // The pool, read against the character's traits
		oncancel: () => void;
		oncontinue: () => void; // On to the macro's details
	}

	let { picker, traits, title, resolved, oncancel, oncontinue }: ComponentProps = $props();

	const missing = $derived(missingTraits(resolved.terms));

	const empty = $derived(picker.picks.length === 0);
	// The number has no chip here: the modifier shows it
	const hasTraits = $derived(picker.picks.some((pick) => !isNumber(pick)));
</script>

<!--
@component
A macro's pool, collapsed to a strip while its traits are picked from the sheet: the macro's name and
the pool's dice, Cancel, and Continue to its details ("Skip pool" while it's empty, since a macro of
Rouse Checks alone needs none); below, the pool's chips across the whole width (many traits wrap
there, not squeezing the buttons), and the modifier at the row's end.
-->
<div class="flex flex-col gap-1.5">
	<div class="flex items-center gap-2">
		<div class="flex min-w-0 flex-1 items-baseline gap-2">
			<span class="font-display truncate text-sm tracking-[0.04em]">{title}</span>
			{#if !empty}<DiceCount dice={resolved.dice} />{/if}
		</div>
		<button
			type="button"
			class="btn-icon hover:preset-tonal-surface shrink-0"
			onclick={oncancel}
			aria-label="Cancel"
			title="Cancel"
		>
			<X size={18} />
		</button>
		<button
			type="button"
			class="btn btn-sm btn-gothic btn-gothic-bone shrink-0"
			onclick={oncontinue}
		>
			<span>{empty ? 'Skip pool' : 'Continue'}</span>
			<ArrowRight size={16} />
		</button>
	</div>
	<div class="flex items-start gap-2">
		<div class="min-w-0 flex-1">
			{#if hasTraits}
				<PoolChips {picker} {traits} {missing} numbers={false} />
			{:else}
				<p class="text-surface-300 text-sm italic">{POOL_HINT}</p>
			{/if}
		</div>
		<Stepper
			compact
			label="Modifier"
			bind:value={() => picker.modifier, (value) => (picker.modifier = value)}
			min={modifierMin(picker)}
			max={MODIFIER_LIMIT}
			detail={modifierDetail(picker.modifier)}
			format={formatModifier}
		/>
	</div>
</div>
