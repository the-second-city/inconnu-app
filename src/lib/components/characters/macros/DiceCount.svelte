<script lang="ts">
	import { diceLabel } from '$lib/rules/macros';

	interface ComponentProps {
		dice: number | null; // A resolved pool's dice; null while a trait is missing
		class?: string; // Its size
	}

	let { dice, class: size = 'text-sm' }: ComponentProps = $props();
</script>

<!--
@component
A pool's dice, in the macros' display face: "5 dice", or a muted "? dice" while one of its traits
isn't on the sheet.
-->
<span class="font-display text-primary-300 shrink-0 tabular-nums {size}">
	{#if dice === null}
		<span class="text-surface-400" title="Some of its traits aren't on the sheet"
			>{diceLabel(null)}</span
		>
	{:else}
		{diceLabel(dice)}
	{/if}
</span>
