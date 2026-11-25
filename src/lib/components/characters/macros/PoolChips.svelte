<script lang="ts">
	import { Minus, Plus, X } from '@lucide/svelte';

	import { KEY_DELIMITER } from '$lib/rules/macros';
	import type { PoolPicker } from '$lib/state/poolPicker.svelte';
	import type { Trait } from '$lib/types';

	interface ComponentProps {
		picker: PoolPicker;
		traits: Trait[]; // The character's, for the pool's order (attributes first)
		missing?: string[]; // Picks the character lacks (a trait or specialty), from an edited macro
	}

	let { picker, traits, missing = [] }: ComponentProps = $props();

	const picks = $derived(picker.ordered(traits));
	// Between a trait and its specialty ({' '} doesn't pass lint)
	const SPACE = ' ';
</script>

<!--
@component
A pool being picked, as chips in the pool's order: each trait (and its specialty) with its sign.
Clicking the chip flips it between added and subtracted (a flaw, say; never the last one added); its
✕ removes it. Subtracted ones go last, in red. One the character lacks (`missing`) is dashed, in
warning colors.
-->
<ul class="flex flex-wrap gap-1.5" aria-label="Pool">
	{#each picks as pick (pick.trait)}
		{@const lacking = missing.includes(pick.trait)}
		<li
			class={[
				'flex items-center rounded-full border text-sm transition-colors',
				lacking
					? 'border-warning-500/70 bg-warning-500/10 text-warning-200 border-dashed'
					: pick.negative
						? 'border-error-500/60 bg-error-500/10 text-error-200'
						: 'border-surface-500 bg-surface-800/60'
			]}
		>
			<!-- The chip itself flips the sign -->
			<button
				type="button"
				class={[
					'group flex items-center gap-1 rounded-l-full py-0.5 pr-0.5 pl-1 enabled:cursor-pointer disabled:cursor-default disabled:opacity-100',
					pick.negative ? 'enabled:hover:bg-error-500/15' : 'enabled:hover:bg-surface-200/10'
				]}
				onclick={() => picker.flip(pick.trait)}
				disabled={!picker.canFlip(pick.trait)}
				aria-pressed={pick.negative}
				aria-label="Subtract {pick.trait}"
				title={(lacking ? 'Not on the sheet. ' : '') +
					(pick.negative
						? `Subtracted: click to add ${pick.trait}`
						: picker.canFlip(pick.trait)
							? `Added: click to subtract ${pick.trait}`
							: 'A pool needs something to add')}
			>
				<span class="flex size-4 shrink-0 items-center justify-center group-disabled:opacity-40">
					{#if pick.negative}<Minus size={12} />{:else}<Plus size={12} />{/if}
				</span>
				<span class="whitespace-nowrap">
					{pick.trait}{#if pick.specialty}{SPACE}<em class="text-primary-300"
							>({pick.specialty.split(KEY_DELIMITER).join(', ')})</em
						>{/if}
				</span>
			</button>
			<button
				type="button"
				class="hover:preset-tonal-error mr-0.5 flex size-5 shrink-0 items-center justify-center rounded-full opacity-60 hover:opacity-100"
				onclick={() => picker.remove(pick.trait)}
				aria-label="Remove {pick.trait}"
				title="Remove"
			>
				<X size={12} />
			</button>
		</li>
	{/each}
</ul>
