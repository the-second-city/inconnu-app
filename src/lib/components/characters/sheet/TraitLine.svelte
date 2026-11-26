<script lang="ts">
	import type { Snippet } from 'svelte';

	import { getPoolPicker } from '$lib/state/poolPicker.svelte';
	import { getSheetHighlight } from '$lib/state/sheetHighlight.svelte';
	import PickableTrait from './PickableTrait.svelte';

	interface ComponentProps {
		// The trait a macro's pool names this line by; none for a line a pool can't roll (Health)
		trait?: string;
		label?: string; // Its name as the sheet shows it, if not `trait` (Blood Potency is Potency)
		subtraits?: string[]; // Offered in its menu while picking
		type?: string; // A Discipline's subtraits are powers, which add no dice
		editing: boolean;
		line: Snippet; // The line as it looks, for while it's a pool's choice (one button)
		children: Snippet; // The line as the sheet uses it (its popovers, menus, and corrections)
		class?: string; // The line's layout, either way
	}

	let {
		trait,
		label,
		subtraits = [],
		type,
		editing,
		line,
		children,
		class: classes = ''
	}: ComponentProps = $props();

	// While a pool is being picked, the line is a choice; a hovered macro that rolls it highlights it
	const picker = getPoolPicker();
	const sheetHighlight = getSheetHighlight();
	const rollable = $derived(!editing && trait !== undefined);
	const pickable = $derived(picker?.active === true && rollable);
	const highlight = $derived(rollable && trait ? sheetHighlight?.of(trait) : undefined);
</script>

<!--
@component
A line of the sheet a macro's pool can roll (a trait's rating, or a tracker's row): while a pool is
picked (the PoolPicker from context is active), the whole line is a PickableTrait; otherwise it's
the sheet's own line, showing a hovered macro's highlight (`data-highlight`, drawn by `.trait-line`
in app.css, as a picked line's ring is).
-->
{#if pickable && picker && trait}
	<PickableTrait {picker} name={trait} {label} {subtraits} {type} {line} lineClass={classes} />
{:else}
	<div
		class="trait-line {classes}"
		data-highlight={highlight ? (highlight.negative ? 'subtracted' : 'added') : undefined}
	>
		{@render children()}
	</div>
{/if}
