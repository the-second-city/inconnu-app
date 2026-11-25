<script lang="ts">
	import type { Snippet } from 'svelte';

	import { getPoolPicker } from '$lib/state/poolPicker.svelte';
	import PickableTrait from './PickableTrait.svelte';

	interface ComponentProps {
		label: string; // As the sheet shows it
		// The trait a macro's pool names it by (the bot's inherent traits: Willpower, Humanity,
		// Potency); none for a row a pool can't roll (Health)
		trait?: string;
		editing: boolean;
		value: Snippet; // The track as it looks, for the row while it's a pool's choice
		children: Snippet; // The track as the sheet uses it (its menus and corrections)
		class?: string; // The row's alignment
	}

	let { label, trait, editing, value, children, class: classes = '' }: ComponentProps = $props();

	// While a pool is being picked, the row is a choice; a hovered macro that rolls it highlights it
	const picker = getPoolPicker();
	const pickable = $derived(picker?.active === true && !editing && trait !== undefined);
	const highlight = $derived(
		!editing && trait !== undefined ? picker?.highlighted(trait) : undefined
	);
	const row = 'col-span-2 grid grid-cols-subgrid gap-2';
</script>

<!--
@component
A row of the sheet's tracker cards (MainTrackers, BloodTrackers): its label and track, spanning the
card's two columns. While a pool is picked (the PoolPicker from context is active), the whole row
picks `trait`, as a trait's line does; otherwise it shows a hovered macro's highlight.
-->
{#snippet line()}
	<span>{label}</span>
	{@render value()}
{/snippet}

{#if pickable && picker && trait}
	<PickableTrait {picker} name={trait} {label} subtraits={[]} {line} lineClass="{row} {classes}" />
{:else}
	<div
		class="trait-line {row} {classes}"
		data-highlight={highlight ? (highlight.negative ? 'subtracted' : 'added') : undefined}
	>
		<div>{label}</div>
		{@render children()}
	</div>
{/if}
