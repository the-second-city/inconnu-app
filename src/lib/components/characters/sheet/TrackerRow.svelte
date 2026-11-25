<script lang="ts">
	import type { Snippet } from 'svelte';

	import TraitLine from './TraitLine.svelte';

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
</script>

<!--
@component
A row of the sheet's tracker cards (MainTrackers, BloodTrackers): its label and track, spanning the
card's two columns (a subgrid), as a TraitLine: a pool's choice while one is picked, and highlighted
by a hovered macro that rolls it.
-->
{#snippet line()}
	<span>{label}</span>
	{@render value()}
{/snippet}

<TraitLine
	{trait}
	{label}
	{editing}
	{line}
	class="col-span-2 grid grid-cols-subgrid gap-2 {classes}"
>
	<div>{label}</div>
	{@render children()}
</TraitLine>
