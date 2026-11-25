<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { Pencil, Trash2 } from '@lucide/svelte';

	import { getPoolPicker } from '$lib/state/poolPicker.svelte';
	import type { Character, Macro } from '$lib/types';
	import MacroCard from './MacroCard.svelte';

	interface ComponentProps {
		character: Character;
		macros?: Macro[]; // The macros to show; the character's by default
		layout?: 'grid' | 'stack'; // Framed cards in columns (the sheet), or a divided list (a panel)
		ondelete?: (macro: Macro) => void; // Gives each macro a Delete button (stack layout)
		onedit?: (macro: Macro) => void; // Gives each macro an Edit button (stack layout)
	}

	let { character, macros, layout = 'grid', ondelete, onedit }: ComponentProps = $props();

	const shown = $derived(macros ?? character.macros ?? []);

	// Hovering a macro shows its traits on the sheet (through the page's pool picker), except while
	// a pool is being picked there
	const picker = getPoolPicker();
	let hovered: string | null = $state(null); // The hovered macro's name
	const enter = (e: PointerEvent, macro: Macro) => {
		if (e.pointerType === 'mouse') hovered = macro.name;
	};
	const leave = (macro: Macro) => {
		if (hovered === macro.name) hovered = null;
	};
	$effect(() => {
		if (!picker || picker.active || hovered === null) return;
		// The macro as it is now (a live update may change it); one that's gone stops showing
		const macro = shown.find((m) => m.name === hovered);
		if (!macro) return;
		picker.show(macro.pool, character);
		return () => picker.hide();
	});
</script>

<!--
@component
A character's macros, in the order the bot keeps them (by name). `grid` frames each in a card, in up
to three columns, for below the sheet; `stack` divides them with rules, for a narrow panel, where
`onedit` and `ondelete` add Edit and Delete buttons to each. Hovering a macro lights it and
highlights its traits on the sheet. A macro taken out of `macros` slides away.
-->
{#if layout === 'grid'}
	<ul class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
		{#each shown as macro (macro.name)}
			<li
				class="card panel-gothic min-w-0 px-4 py-3 transition-all hover:brightness-110"
				onpointerenter={(e) => enter(e, macro)}
				onpointerleave={() => leave(macro)}
			>
				<MacroCard {macro} {character} />
			</li>
		{/each}
	</ul>
{:else}
	<ul class="divide-surface-600 flex flex-col divide-y">
		{#each shown as macro (macro.name)}
			<li
				class="hover:bg-surface-200/[0.06] -mx-2 flex items-start gap-2 rounded-md px-2 py-3 transition-colors first:pt-2 last:pb-2"
				transition:slide={{ duration: 200 }}
				onpointerenter={(e) => enter(e, macro)}
				onpointerleave={() => leave(macro)}
			>
				<div class="min-w-0 flex-1">
					<MacroCard {macro} {character} />
				</div>
				{#if onedit}
					<button
						type="button"
						class="hover:preset-tonal-surface -mr-1 shrink-0 rounded-full p-1.5"
						onclick={() => onedit(macro)}
						aria-label="Edit {macro.name}"
						title="Edit"
						transition:fade={{ duration: 200 }}
					>
						<Pencil size={16} />
					</button>
				{/if}
				{#if ondelete}
					<button
						type="button"
						class="hover:preset-tonal-error text-error-400 -mr-1 shrink-0 rounded-full p-1.5"
						onclick={() => ondelete(macro)}
						aria-label="Delete {macro.name}"
						title="Delete"
						transition:fade={{ duration: 200 }}
					>
						<Trash2 size={16} />
					</button>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
