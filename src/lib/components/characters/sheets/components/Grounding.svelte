<script lang="ts">
	import type { Grounding } from '$lib/types';
	import { normalize, isValidTraitName } from '$lib';

	import RatingSelector from './RatingSelector.svelte';

	interface ComponentProps {
		grounding: Grounding;
		allowsPathChange: boolean;
		editing: boolean;
	}

	let { grounding = $bindable(), allowsPathChange, editing }: ComponentProps = $props();

	let newPathName = $state(grounding.path);
	let normalizedPathName = $derived(normalize(newPathName));

	$effect(() => {
		if (isValidTraitName(normalizedPathName)) {
			grounding.path = normalizedPathName;
		}
	});
</script>

<div class="mt-3 flex flex-col items-center gap-2">
	{#if editing && allowsPathChange}
		<input
			type="text"
			bind:value={newPathName}
			class="input border text-center"
			class:text-error-500={!isValidTraitName(normalizedPathName)}
			class:border-error-500={!isValidTraitName(normalizedPathName)}
		/>
	{:else}
		<h6 class="h6">{grounding.path}</h6>
	{/if}
	<RatingSelector
		bind:name={grounding.path}
		bind:rating={grounding.rating}
		showLabel={false}
		max={10}
		{editing}
		allowsSubtraits={false}
	/>
</div>
