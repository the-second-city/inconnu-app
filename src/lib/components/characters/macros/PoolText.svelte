<script lang="ts">
	import type { PoolTerm } from '$lib/rules/macros';

	interface ComponentProps {
		terms: PoolTerm[]; // A resolved pool's terms (see resolvePool)
	}

	let { terms }: ComponentProps = $props();

	// The space between terms, where the pool may wrap. Svelte drops the whitespace between an
	// {#each} block's items, and a literal ({' '}) doesn't pass lint
	const BREAK = ' ';
</script>

<!--
@component
A pool as text: "Strength + Brawl (Kindred)". Each term (with the operator before it) stays on one
line, so a pool wraps between terms, never inside a multiword trait's name. Terms the character
lacks are struck through.
-->
<p class="leading-snug">
	{#each terms as term, i (i)}
		{#if i > 0}{BREAK}{/if}
		<span class="whitespace-nowrap">
			{#if i > 0 || term.sign === '-'}
				<span class="text-surface-400">{term.sign === '-' ? '−' : '+'}</span>
			{/if}
			<span
				class={term.missing ? 'text-error-400 line-through decoration-1' : ''}
				title={term.missing ? `Not on the sheet: ${term.missing}` : undefined}>{term.name}</span
			>
			{#if term.specialties.length > 0}
				<em class="text-primary-300">({term.specialties.join(', ')})</em>
			{/if}
		</span>
	{/each}
</p>
