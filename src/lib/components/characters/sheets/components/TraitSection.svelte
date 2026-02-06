<script lang="ts">
	import type { Trait } from '$lib/types';
	import TraitColumn from './TraitColumn.svelte';

	type Direction = 'horizontal' | 'vertical';

	interface ComponentProps {
		title?: string | null;
		cat: string;
		subs: string[];
		traits: Trait[];
		dir?: Direction;
		editing: boolean;
		allowsSubtraits: boolean;
	}

	let {
		title = null,
		cat,
		subs,
		traits = $bindable(),
		dir = 'horizontal',
		editing,
		allowsSubtraits
	}: ComponentProps = $props();
</script>

{#if dir === 'horizontal'}
	<!-- Horizontal layout (original) -->
	{#if title}
		<h2 class="h2 text-2xl uppercase">{title}</h2>
	{/if}
	<div
		class="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:flex-wrap sm:items-center"
	>
		{#each subs as sub, i}
			<TraitColumn name={sub} {cat} bind:traits {editing} {allowsSubtraits} />
		{/each}
	</div>
{:else}
	<!-- Vertical layout with properly aligned title -->
	<div class="flex flex-col gap-3">
		<h2 class="h2 text-2xl uppercase">{title}</h2>
		<div class="flex flex-col gap-3">
			{#each subs as sub, i}
				<TraitColumn name={sub} {cat} bind:traits {editing} {allowsSubtraits} />
			{/each}
		</div>
	</div>
{/if}
