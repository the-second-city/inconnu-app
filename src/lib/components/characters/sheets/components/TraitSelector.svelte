<script lang="ts">
	import type { Trait } from '$lib/types';

	import RatingSelector from './RatingSelector.svelte';

	interface ComponentProps {
		trait: Trait;
		min?: number;
		max?: number;
		showLabel?: boolean;
		editing: boolean;
		allowsSubtraits: boolean;
	}

	let {
		trait = $bindable(),
		min = 0,
		max = 5,
		showLabel = true,
		editing,
		allowsSubtraits
	}: ComponentProps = $props();
</script>

<RatingSelector
	bind:name={trait.name}
	bind:rating={trait.rating}
	bind:subtraits={trait.subtraits}
	{min}
	{max}
	{showLabel}
	{editing}
	{allowsSubtraits}
/>
