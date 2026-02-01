<script lang="ts">
	import type { Trait } from '$lib/types';

	import Card from '$lib/components/Card.svelte';
	import RatingSelector from '../RatingSelector.svelte';

	interface ComponentProps {
		virtues: Trait[];
		editing: boolean;
	}
	let { virtues = $bindable(), editing }: ComponentProps = $props();

	const reciprocals: Record<string, string> = {
		Courage: 'Courage',
		SelfControl: 'Instincts',
		Instincts: 'SelfControl',
		Conscience: 'Conviction',
		Conviction: 'Conscience'
	};
</script>

{#snippet selector(virtue: Trait)}
	{@const reciprocal = reciprocals[virtue.name]}

	{#if virtue.name === reciprocal || !editing}
		<span class="inline-block px-4 py-2">{virtue.name}</span>
	{:else}
		<select
			class="select w-auto border pr-8"
			id={`virtue-${virtue.name}-${reciprocal}`}
			bind:value={virtue.name}
			aria-label={`Select between ${virtue.name} and ${reciprocal}`}
		>
			<option value={virtue.name}>{virtue.name}</option>
			<option value={reciprocal}>{reciprocal}</option>
		</select>
	{/if}
{/snippet}

<Card>
	<h3 class="h3 -mt-1 mb-2 text-xl font-semibold uppercase">Virtues</h3>
	<div class="flex flex-col gap-2">
		{#each virtues as virtue (virtue.name)}
			<div class="flex flex-wrap items-center justify-between">
				{@render selector(virtue)}
				<RatingSelector bind:rating={virtue.rating} {editing} allowsSubtraits={false} />
			</div>
		{/each}
	</div>
</Card>
