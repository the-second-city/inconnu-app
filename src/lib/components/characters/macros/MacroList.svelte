<script lang="ts">
	import type { Character } from '$lib/types';
	import MacroCard from './MacroCard.svelte';

	interface ComponentProps {
		character: Character;
		layout?: 'grid' | 'stack'; // Framed cards in columns (the sheet), or a divided list (a panel)
	}

	let { character, layout = 'grid' }: ComponentProps = $props();

	const macros = $derived(character.macros ?? []);
</script>

<!--
@component
A character's macros, in the order the bot keeps them (by name). `grid` frames each in a card, in up
to three columns, for below the sheet; `stack` divides them with rules, for a narrow panel.
-->
{#if layout === 'grid'}
	<ul class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
		{#each macros as macro (macro.name)}
			<li class="card panel-gothic min-w-0 px-4 py-3">
				<MacroCard {macro} {character} />
			</li>
		{/each}
	</ul>
{:else}
	<ul class="divide-surface-600 flex flex-col divide-y">
		{#each macros as macro (macro.name)}
			<li class="py-3 first:pt-0 last:pb-0">
				<MacroCard {macro} {character} />
			</li>
		{/each}
	</ul>
{/if}
